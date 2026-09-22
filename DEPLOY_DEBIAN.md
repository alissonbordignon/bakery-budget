# Instalação no Debian com Apache

O sistema é uma aplicação **Next.js/Node.js** com banco **SQLite**. O Apache recebe o acesso público e encaminha internamente para a aplicação na porta 3000.

## Página inicial

- Endereço final sugerido: `https://orcamentos.panificadoradreon.com.br/`
- Caminho inicial: `/`
- Arquivo da tela inicial: `app/page.tsx`
- API usada pelo sistema: `/api/data`

Troque `orcamentos.panificadoradreon.com.br` nos comandos e no arquivo do Apache se desejar usar outro domínio ou subdomínio.

## 1. Configure o DNS

No painel DNS da HostGator, crie um registro **A**:

- Nome/host: `orcamentos`
- Destino: IP público do servidor Debian

A propagação pode levar algum tempo. Continue a instalação enquanto isso.

## 2. Instale os programas necessários

Entre no servidor por SSH e execute:

```bash
sudo apt update
sudo apt install -y apache2 apache2-utils certbot python3-certbot-apache build-essential python3 unzip curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@11.25.0 --activate
node --version
pnpm --version
```

O Node deve ser versão 22 ou mais recente.

## 3. Envie e prepare o projeto

Envie o ZIP para o servidor (por exemplo, para `/tmp`) e então execute:

```bash
sudo useradd --system --home /opt/orcamentos-dreon --shell /usr/sbin/nologin orcamentos-dreon 2>/dev/null || true
sudo mkdir -p /opt/orcamentos-dreon /var/lib/orcamentos-dreon
sudo unzip /tmp/orcamentos-dreon-debian.zip -d /opt/orcamentos-dreon
sudo chown -R orcamentos-dreon:www-data /opt/orcamentos-dreon /var/lib/orcamentos-dreon
sudo chmod 750 /var/lib/orcamentos-dreon
sudo -u orcamentos-dreon pnpm --dir /opt/orcamentos-dreon install --frozen-lockfile
sudo -u orcamentos-dreon pnpm --dir /opt/orcamentos-dreon build
```

Se os arquivos forem extraídos dentro de uma subpasta, mova o conteúdo dessa subpasta para `/opt/orcamentos-dreon` antes de instalar.

## 4. Ative o serviço permanente

```bash
sudo cp /opt/orcamentos-dreon/deploy/orcamentos-dreon.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now orcamentos-dreon
sudo systemctl status orcamentos-dreon --no-pager
```

Teste diretamente no próprio servidor:

```bash
curl -I http://127.0.0.1:3000/
```

Para ver erros ou acompanhar a execução:

```bash
sudo journalctl -u orcamentos-dreon -n 100 --no-pager
```

## 5. Configure o Apache e a senha

Crie o usuário que poderá abrir o sistema. O comando pedirá uma senha:

```bash
sudo htpasswd -c /etc/apache2/.htpasswd-orcamentos-dreon admin
```

Ative os módulos e o site:

```bash
sudo a2enmod proxy proxy_http headers ssl
sudo cp /opt/orcamentos-dreon/deploy/apache-orcamentos-dreon.conf /etc/apache2/sites-available/orcamentos-dreon.conf
sudo a2ensite orcamentos-dreon.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Ao acessar o endereço, o navegador solicitará o usuário `admin` e a senha criada. Para adicionar outro usuário, use `sudo htpasswd /etc/apache2/.htpasswd-orcamentos-dreon NOME` sem a opção `-c`.

## 6. Ative HTTPS gratuito

Depois que o DNS estiver apontando para o servidor:

```bash
sudo certbot --apache -d orcamentos.panificadoradreon.com.br
```

Selecione a opção de redirecionar HTTP para HTTPS. A página inicial ficará em:

`https://orcamentos.panificadoradreon.com.br/`

## Atualizações

Faça backup do banco, substitua os arquivos do projeto e recompile:

```bash
sudo systemctl stop orcamentos-dreon
sudo cp /var/lib/orcamentos-dreon/orcamentos.sqlite /var/lib/orcamentos-dreon/orcamentos.sqlite.backup
sudo -u orcamentos-dreon pnpm --dir /opt/orcamentos-dreon install --frozen-lockfile
sudo -u orcamentos-dreon pnpm --dir /opt/orcamentos-dreon build
sudo systemctl start orcamentos-dreon
```

## Backup

O arquivo importante é `/var/lib/orcamentos-dreon/orcamentos.sqlite`. Guarde uma cópia frequente dele em outro local. Para um backup consistente:

```bash
sudo systemctl stop orcamentos-dreon
sudo cp /var/lib/orcamentos-dreon/orcamentos.sqlite /caminho-do-backup/orcamentos-$(date +%F).sqlite
sudo systemctl start orcamentos-dreon
```
