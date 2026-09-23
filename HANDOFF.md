# HANDOFF — Sistema de Orçamentos Panificadora Dreon

Este documento resume o estado atual do sistema para quem for continuar o
desenvolvimento (com ou sem a ajuda do Claude). Ele substitui qualquer versão
anterior deste arquivo.

## 1. Visão geral

**Arquivo único**: `orcamentos_dreon.py` (~3.390 linhas). Sem dependências externas
(sem `pip install`, sem `npm`) — só biblioteca padrão do Python 3. O frontend
(HTML/CSS/JS) fica embutido em strings Python dentro do próprio arquivo e é servido
por um `ThreadingHTTPServer` simples. Persistência em SQLite.

- **Banco**: `./data/orcamentos-dreon.sqlite` (configurável via env `DATABASE_PATH`)
- **Porta**: `8010` (configurável via env `PORT`)
- **Rodar**: `python3 orcamentos_dreon.py`

Não há build step, transpilação nem bundler — é só rodar o `.py`.

## 2. Banco de dados

```sql
products (
  id, code, name, category, unit, price_cents, minimum_quantity,
  description, active, created_at, updated_at
)

settings (key, value)  -- chave/valor livre, ver seção 2.1

categories (id, name, created_at)

quotes (
  id TEXT PK, quote_number TEXT UNIQUE,
  customer_name, customer_phone, event_date, event_time,
  valid_until, notes,
  subtotal_cents, deposit_percent,
  created_at, approved INTEGER DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  final_cents INTEGER DEFAULT 0,
  deposit_paid_cents INTEGER  -- nullable
)

quote_items (
  id, quote_id FK ON DELETE CASCADE, product_id, product_name,
  unit, quantity, unit_price_cents, total_cents
)
```

Migrações automáticas rodam em `_run_migrations(conn)` toda vez que o servidor
sobe: ela detecta colunas ausentes num banco já existente (`approved`,
`discount_percent`, `final_cents`, `deposit_paid_cents`, `event_time`) e faz o
`ALTER TABLE` necessário, sem apagar dados. Se adicionar uma coluna nova no
futuro, o padrão é: mexer em `SCHEMA_SQL` (para bancos novos) **e** em
`_run_migrations` (para bancos já existentes em produção).

### 2.1 Chaves usadas em `settings`

`company_name`, `trade_name`, `cnpj`, `phone`, `email`, `address`,
`validity_days`, `deposit_percent`, `lead_time_days`, `payment_note`,
`access_pin` (PIN de acesso ao sistema, 4–6 dígitos numéricos, padrão `000000`).

## 3. Autenticação (PIN estilo MFA)

- Toda rota de API (`/api/data`, `/api/quote-pdf`) exige uma sessão válida — sem
  ela, devolve 401.
- `POST /api/login` com `{"pin": "XXXXXX"}` → seta cookie `session`
  (`HttpOnly`, validade 30 dias).
- `POST /api/logout` → invalida a sessão.
- Limite de tentativas: 6 erros em 60s → bloqueio de 30s (429).
- Sessões ficam **em memória** do processo — reiniciar o servidor derruba todo
  mundo (precisa logar de novo).
- O PIN é configurável na aba "Dados da empresa" (`access_pin`), validado tanto
  no backend (`action_save_settings`) quanto no frontend antes de enviar.
- Tela de login: 6 caixinhas estilo MFA com avanço automático de foco e suporte
  a colar o código inteiro de uma vez, com a logo da padaria acima.
- Funções relevantes: `_create_session`, `_is_valid_session`,
  `_destroy_session`, `_login_rate_limited`, `_register_login_failure/success`.

## 4. API

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/` | GET | não | HTML do SPA (`rendered_html()`) |
| `/api/data` | GET | sim | `{products, settings, quotes, categories}` |
| `/api/data` | POST | sim | ações, ver tabela abaixo |
| `/api/quote-pdf` | POST | sim | gera e baixa o PDF do orçamento |
| `/api/login` | POST | não | autentica via PIN |
| `/api/logout` | POST | não | encerra a sessão |
| `/health` | GET | não | health check |

**Ações de `POST /api/data`** (dict `ACTIONS`, despachado em
`handle_post_action`):

| action | função | efeito |
|---|---|---|
| `saveSettings` | `action_save_settings` | upsert em massa em `settings` (valida PIN) |
| `saveProduct` | `action_save_product` | cria/edita produto, cria categoria automaticamente se for nova |
| `toggleProduct` | `action_toggle_product` | ativa/desativa produto |
| `saveCategory` | `action_save_category` | cria ou renomeia (com cascata em `products.category`) |
| `deleteCategory` | `action_delete_category` | apaga se nenhum produto estiver usando |
| `saveQuote` | `action_save_quote` | `INSERT` de orçamento novo + itens |
| `updateQuote` | `action_update_quote` | `UPDATE` do orçamento + substitui os itens |
| `deleteQuote` | `action_delete_quote` | `DELETE` + cascade nos itens |
| `toggleQuoteApproval` | `action_toggle_quote_approval` | alterna `approved` (0↔1) |

**Resposta de `GET /api/data`** (ver `handle_get_data`):

```json
{
  "products": [{id, code, name, category, unit, priceCents, minimumQuantity, description, active}],
  "settings": {"company_name": "...", "access_pin": "...", ...},
  "quotes": [{
    id, quoteNumber, customerName, customerPhone, eventDate, eventTime,
    validUntil, notes, subtotalCents, depositPercent, createdAt,
    approved, discountPercent, finalCents, depositPaidCents, items: [...]
  }],
  "categories": [{id, name}]
}
```

## 5. Formato do número de orçamento

`ORC-DDMMYYYY-NNN` — exemplo: `ORC-22092026-001` (data em formato brasileiro,
sequência reinicia por dia).

## 6. Gerador de PDF (Python puro, sem libs)

Classes principais: `_PdfPage`, `_PdfDocument`, `_QuoteDocumentPdf`
(monta o documento) e `build_quote_pdf(quote, settings)` (função de entrada).

- Usa fontes base-14 do PDF (Helvetica / Helvetica-Bold) com
  `WinAnsiEncoding` — cobre acentuação em português sem precisar embutir fonte.
- Endpoint `POST /api/quote-pdf` devolve o PDF direto como anexo
  (`Content-Disposition: attachment`), nome do arquivo via
  `build_pdf_filename(quote)` → `"ORC-XXXX - Nome do Cliente.pdf"`.
- Paginação automática para pedidos grandes (o cabeçalho de tabela se repete
  em páginas de continuação).
- Conteúdo do PDF: cabeçalho com a **logo real** (ver seção 7), dados do
  cliente, data e horário do evento, itens, totais (desconto, valor final,
  sinal recebido/restante), observações, caixa de confirmação de pagamento e
  rodapé com dados da empresa.
- Validado com `qpdf --check` e inspeção visual via `pdftoppm`.

## 7. Logo da empresa — como funciona (leia antes de mexer!)

A logo (trigo dourado + "Dreon Panificadora", fundo transparente, 585×260px)
vive em **uma única fonte de verdade**: a constante Python `LOGO_BASE64`
(base64 de um PNG RGBA de 8 bits). **Todo lugar que mostra a logo deve puxar
dela** — nunca cole um base64 de imagem direto no meio do HTML ou do JS.

Como cada lugar consome essa fonte hoje:

1. **Cabeçalho do painel** (`<img class="brand">`) e **tela de login**
   (`<img class="login-logo">`) — ambos usam o placeholder literal
   `__LOGO_BASE64__` dentro de `INDEX_HTML`, substituído em `rendered_html()`.
2. **Preview do orçamento na tela** (`.doc-logo`, dentro de `APP_JS`) — usa a
   variável JS `window.__LOGO_B64__`, que por sua vez também contém o
   placeholder `__LOGO_BASE64__` no código-fonte Python, substituído no mesmo
   passo.
3. **PDF** — decodifica `LOGO_BASE64` diretamente em Python (ver abaixo), sem
   passar pelo HTML.

A substituição final acontece em uma única linha:

```python
_RENDERED_HTML = INDEX_HTML.replace("__APP_JS__", APP_JS).replace("__LOGO_BASE64__", LOGO_BASE64)
```

**Importante**: o `__APP_JS__` é substituído **primeiro**, e só depois o
`__LOGO_BASE64__` — nessa ordem, porque o placeholder da logo existe tanto
dentro de `INDEX_HTML` quanto dentro de `APP_JS`, e só assim uma única
`.replace()` final cobre os dois. Se inverter a ordem, o placeholder que está
dentro do JS já recém-inserido não seria mais alcançado.

### Por que isso importa (bug já corrigido, mas fique atento)

Em uma sessão anterior, o cabeçalho e o preview do orçamento tinham cópias
**fixas** (hardcoded) de uma logo antiga (um selo vermelho vintage, a logo
original do sistema antes de qualquer alteração), coladas diretamente no meio
do HTML/JS, sem passar pelo placeholder. Trocar só a variável `LOGO_BASE64`
não alcançava essas duas cópias soltas — por isso a logo nova aparecia
corretamente na tela de login e no PDF, mas o selo antigo insistia em
aparecer no cabeçalho e no preview. Foi corrigido substituindo as duas cópias
fixas pelo placeholder `__LOGO_BASE64__`. **Se no futuro a logo for trocada de
novo, troque só a constante `LOGO_BASE64`** e rode o teste da seção 9 abaixo
para confirmar que não sobrou nenhum `__LOGO_BASE64__` sem substituir e que
os 4 lugares (cabeçalho, login, preview, PDF) batem com o mesmo valor.

### Decodificador de PNG próprio (para o PDF)

Como não há biblioteca de imagem disponível, o PDF embute a logo de verdade
(não um texto substituto) através de um decodificador de PNG escrito do zero:

- `_png_decode_rgba8(png_bytes)` — decodifica um PNG de 8 bits/RGBA sem
  entrelaçamento (parseia os chunks, descomprime o `IDAT` com `zlib` da
  biblioteca padrão, desfaz a filtragem por linha — suporta os 5 tipos de
  filtro do PNG). Validado byte a byte contra o Pillow durante o
  desenvolvimento.
- `_get_logo_image_data()` — decodifica `LOGO_BASE64` **uma única vez**,
  separa em plano RGB (para o objeto de imagem principal) e plano Alfa (para
  a `/SMask`, garantindo transparência real no PDF), já comprimidos com
  `zlib`, e guarda em cache num global do módulo (`_LOGO_IMAGE_CACHE`). Isso
  faz a primeira geração de PDF custar ~290ms e as seguintes ~18ms.
- Se a decodificação falhar por qualquer motivo, o PDF cai automaticamente
  para um cabeçalho só de texto ("PANIFICADORA DREON") — nunca quebra a
  geração do documento.
- `_PdfDocument.add_image(...)` / `page.draw_image(...)` — API genérica para
  registrar uma imagem (RGB+alfa já comprimidos) e desenhá-la em qualquer
  página; hoje só é usada pela logo, mas serve para qualquer imagem futura.

## 8. Frontend SPA

Estado global em JS: `state = {products, quotes, settings, categories, items,
selectedProduct, editingProductId, editingQuoteId, currentNumber, saved,
saving, savingSettings, savingProduct, deletingQuoteId, togglingApprovalId,
deletingCategoryId, discountSource}`.

### Abas

1. **🧮 Novo orçamento** — fluxo em 3 etapas dentro do mesmo painel:
   - **Etapa 1 — Dados do cliente**: nome, WhatsApp, data do evento + horário
     lado a lado, validade calculada automaticamente. Domingos são bloqueados
     no seletor de data (limpa o campo e mostra um toast, sem mensagem fixa
     no formulário).
   - **Etapa 2 — Adicionar produtos**: combobox com todos os produtos ativos
     (sem limite de itens exibidos), tabela de itens com quantidade editável.
   - **Etapa 3 — Valores e pagamento**: valor total (somado, readonly),
     desconto em % OU valor final digitado direto (o outro campo é calculado
     automaticamente — controlado por `state.discountSource`), sinal já
     recebido (opcional, calcula o valor residual), resumo do desconto em
     texto.
2. **📦 Pedidos** (era "Histórico") — lista com Número, Cliente, Status
   (🟡 Pendente / 🟢 Aprovado, com botão para alternar), Evento (data+hora),
   Validade, Total, Valor residual (mostra "Quitado ✓" em verde quando o
   sinal cobre o total). Ações por linha: Editar (recarrega desconto+sinal no
   formulário), Duplicar (mantém desconto, limpa o sinal recebido, gera
   número novo), Excluir (com confirmação), Baixar PDF.
3. **🏬 Produtos** — CRUD de produtos com categoria via dropdown (editável:
   dá para criar/renomear categoria direto do formulário de produto).
4. **⚙️ Dados da empresa** — configurações gerais + o campo `access_pin`.

### Impressão / PDF

Botão **"📥 Baixar PDF"** chama `POST /api/quote-pdf` com os dados atuais do
formulário e baixa o arquivo direto, sem diálogo de impressão. Ainda existe
CSS de `@media print` para quem preferir Ctrl+P a partir do preview na tela.

## 9. Como testar

Sempre rodar esta sequência antes de considerar uma mudança pronta (todos os
comandos abaixo assumem `cd` para a pasta onde está `orcamentos_dreon.py`):

```bash
# 1) sintaxe Python
python3 -m py_compile orcamentos_dreon.py

# 2) sintaxe do JS embutido
python3 -B -c "
import sys; sys.dont_write_bytecode = True
import orcamentos_dreon as m
print(m.APP_JS)
" > /tmp/app.js
node --check /tmp/app.js

# 3) HTML bem formado (tags abrem/fecham corretamente) + nenhum placeholder sobrando
python3 -B << 'EOF'
import sys; sys.dont_write_bytecode = True
from html.parser import HTMLParser
import orcamentos_dreon as m
html = m.rendered_html()
class Checker(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack=[]; self.void={"meta","link","img","br","input","hr"}; self.errors=[]
    def handle_starttag(self, tag, attrs):
        if tag not in self.void: self.stack.append(tag)
    def handle_startendtag(self, tag, attrs): pass
    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag: self.errors.append(f"{tag} mismatch")
        else: self.stack.pop()
c = Checker(); c.feed(html)
print("pendentes:", c.stack, "| erros:", c.errors)
print("nenhum __LOGO_BASE64__ sobrando:", "__LOGO_BASE64__" not in html)
EOF

# 4) fluxo real: sobe o servidor em background NA MESMA chamada de shell que os testes
#    (processos em background não sobrevivem entre chamadas de ferramenta separadas!)
rm -rf /tmp/testdata /tmp/server.log
(PORT=8010 DATABASE_PATH=/tmp/testdata/test.sqlite python3 orcamentos_dreon.py > /tmp/server.log 2>&1 &)
sleep 1.2
curl -s -c /tmp/cookies.txt -X POST http://127.0.0.1:8010/api/login -H "Content-Type: application/json" -d '{"pin":"000000"}'
curl -s -b /tmp/cookies.txt http://127.0.0.1:8010/api/data | python3 -m json.tool | head -20
# ... mais chamadas curl para exercitar as ações que você mudou ...
curl -s -b /tmp/cookies.txt -X POST http://127.0.0.1:8010/api/quote-pdf -H "Content-Type: application/json" \
  -d '{"quote":{"quoteNumber":"ORC-1","customerName":"Teste","subtotalCents":5000,"finalCents":5000,"items":[{"productName":"Bolo","unit":"kg","quantity":1,"totalCents":5000}]}}' \
  -o /tmp/teste.pdf
qpdf --check /tmp/teste.pdf
pkill -f orcamentos_dreon.py
rm -rf /tmp/testdata /tmp/server.log /tmp/cookies.txt /tmp/teste.pdf /tmp/app.js
```

Detalhe importante de ambiente: **processos em background (`&`) só sobrevivem
dentro da mesma chamada de shell** — se sua ferramenta executa cada comando
bash numa chamada separada, suba o servidor, rode os testes e derrube o
servidor **tudo no mesmo comando**, ou ele morre antes do curl rodar.

Se mexer em qualquer coisa relacionada à logo (seção 7), sempre confirme
visualmente depois: extraia o HTML/JS renderizado, decodifique a imagem e
`view` o PNG resultante — string igual não é garantia de que o *pixel* é o
esperado (foi assim que o bug da seção 7 foi encontrado).

## 10. Histórico de mudanças (cronológico)

1. Migração do sistema original (Next.js + better-sqlite3) para este arquivo
   único em Python stdlib, replicando cardápio, cálculo por kg/cento/unidade,
   orçamento imprimível, WhatsApp, configurações da empresa.
2. Editar (sem gerar número novo) / duplicar / excluir orçamentos no
   histórico.
3. Reset automático do formulário depois de salvar um orçamento novo, já
   mostrando o próximo número sequencial.
4. Botão "Limpar" mais visível (laranja, com confirmação se houver dados).
5. Categorias editáveis com dropdown no formulário de produto.
6. QR Code do PIX foi cogitado e chegou a ser prototipado (encoder próprio,
   sem libs) — **descartado a pedido do usuário**; não há nenhum resquício no
   código atual. Se pedirem de novo no futuro, é trabalho suficiente para uma
   sessão dedicada (Reed-Solomon, matriz, máscaras).
7. Aba "Histórico" renomeada para **"Pedidos"** (ícone 📦).
8. Botão de aprovar pedido + indicador de status 🟡/🟢.
9. Etapa 3 do formulário ganhou desconto (% ou valor final), sinal recebido e
   cálculo automático do valor residual.
10. Coluna "Valor residual" na aba Pedidos (mostra "Quitado ✓" quando o sinal
    cobre o total).
11. Campo de horário do evento ao lado da data.
12. Bloqueio de domingos no seletor de data (toast pontual, sem mensagem fixa
    no formulário).
13. Formato do número de orçamento mudou de `ORC-YYYYMMDD-NNN` para
    `ORC-DDMMYYYY-NNN`.
14. Botão "📥 Baixar PDF" passou a gerar um PDF de verdade (gerador próprio em
    Python puro) e baixar direto, em vez de abrir o diálogo de impressão do
    navegador.
15. Lista de produtos no combobox deixou de ser cortada em 15 itens.
16. **Primeira troca de logo**: nova logo (trigo dourado + "Dreon
    Panificadora", fundo transparente) embutida via variável `LOGO_BASE64`,
    aplicada na tela de login e (via placeholder) deveria valer para todo o
    resto — nessa sessão passou despercebido que havia cópias fixas da logo
    antiga soltas em outros dois lugares (ver item 18).
17. Tela de login MFA (6 dígitos), sessão em cookie de 30 dias, toda a API
    protegida, limite de tentativas de login, PIN configurável nas
    configurações da empresa.
18. **Logo embutida no PDF**: decodificador de PNG próprio (RGBA 8 bits, sem
    entrelaçamento) escrito do zero, validado byte a byte contra o Pillow;
    logo desenhada no PDF com transparência real via `/SMask` (canal alfa
    separado do canal RGB). Cache em memória do módulo faz a 1ª geração de
    PDF custar ~290ms e as seguintes ~18ms.
19. **Correção do bug da logo "fantasma"**: cabeçalho do painel e preview do
    orçamento na tela continuavam mostrando a logo antiga (selo vermelho
    vintage) porque tinham cópias fixas dela coladas direto no HTML/JS,
    fora do mecanismo de placeholder. Unificado tudo numa única fonte de
    verdade (`LOGO_BASE64`) — ver seção 7 para o detalhe completo e evitar
    reincidência.

## 11. Convenções para novas mudanças

- **Nova aba** → siga o padrão das existentes: `<section class="tab-panel
  hidden" data-tab="nome">` no HTML, botão correspondente em `.tabs`, função
  `renderXxxTab()` no JS chamada a partir de `loadData()`; `switchTab()` já é
  genérica por `data-tab` e cobre mostrar/esconder automaticamente.
- **Novo diálogo** → copie o padrão de `<dialog id="category-dialog">`: HTML
  com `.dialog-body`/`.dialog-head`/`.dialog-footer`, abrir com
  `document.getElementById('id').showModal()`.
- **Nova ação de API** → função `action_xxx(conn, body)` + registro no dict
  `ACTIONS`; sempre valide entradas e use `ApiError` para mensagens de erro em
  português.
- **Novo campo de produto/orçamento** → mexe em 3 lugares: `SCHEMA_SQL`
  (coluna nova para bancos criados do zero), `_run_migrations` (`ALTER TABLE`
  para bancos já existentes), a função `row_to_*()`/`handle_get_data`
  correspondente (expor no JSON) e o HTML/JS do formulário.
- **Funções expostas ao HTML** devem estar registradas em `window.app = {...}`.
- **Qualquer coisa envolvendo a logo/imagens** → leia a seção 7 primeiro.
- **Sempre rode os testes da seção 9** antes de considerar uma mudança
  pronta, incluindo o teste funcional via curl com o servidor rodando de
  verdade.
