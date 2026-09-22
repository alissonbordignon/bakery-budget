"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Check, ClipboardCopy, FileText, History, Loader2, MessageCircle, PackagePlus, Pencil, Plus, Printer, RefreshCw, Save, Settings, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type Product = { id: number; code: string; name: string; category: string; unit: "kg" | "cento" | "unidade"; priceCents: number; minimumQuantity: number; description: string; active: boolean };
type QuoteItem = { id: string; productId: number | null; productName: string; unit: Product["unit"]; quantity: number; unitPriceCents: number; totalCents: number };
type Quote = { id: string; quoteNumber: string; customerName: string; customerPhone: string; eventDate: string | null; validUntil: string; notes: string; subtotalCents: number; depositPercent: number; createdAt: string; items: QuoteItem[] };
type SettingsMap = Record<string, string>;
type ProductOption = { value: string; label: string; product: Product };

const logoUrl = "/dreon-logo.png";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR");
function formatDate(value?: string | null) { return value ? dateFormatter.format(new Date(`${value.slice(0, 10)}T12:00:00`)) : "-"; }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(days: number) { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function quoteNumber(sequence: number) { return `ORC-${todayISO().replaceAll("-", "")}-${String(sequence + 1).padStart(3, "0")}`; }
function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
function quantityLabel(item: Pick<QuoteItem, "unit" | "quantity">) { return item.unit === "kg" ? `${item.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg` : `${item.quantity.toLocaleString("pt-BR")} un.`; }
function priceLabel(product: Product | QuoteItem) { const suffix = product.unit === "kg" ? "/kg" : product.unit === "cento" ? "/cento" : "/un."; const cents = "priceCents" in product ? product.priceCents : product.unitPriceCents; return `${money.format(cents / 100)} ${suffix}`; }
function emptyProduct(): Product { return { id: 0, code: "", name: "", category: "Bolos", unit: "kg", priceCents: 0, minimumQuantity: 0, description: "", active: true }; }

export default function Home() {
  const [activeTab, setActiveTab] = useState("quote");
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [currentNumber, setCurrentNumber] = useState("");
  const [saved, setSaved] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [quantity, setQuantity] = useState("");
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product>(emptyProduct());

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProducts(data.products); setQuotes(data.quotes); setSettings(data.settings);
      setCurrentNumber((value) => value || quoteNumber(data.quotes.length));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível carregar os dados."); }
    finally { setLoading(false); }
  };
  // A carga inicial sincroniza a interface com o banco persistente do servidor.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, []);

  const productOptions = useMemo<ProductOption[]>(() => products.filter((p) => p.active).map((product) => ({ value: String(product.id), label: `${product.name} · ${priceLabel(product)}`, product })), [products]);
  const filteredProductOptions = useMemo(() => {
    const query = productQuery.trim().toLocaleLowerCase("pt-BR");
    return (query ? productOptions.filter((option) => option.label.toLocaleLowerCase("pt-BR").includes(query)) : productOptions).slice(0, 15);
  }, [productOptions, productQuery]);
  const subtotalCents = useMemo(() => items.reduce((total, item) => total + item.totalCents, 0), [items]);
  const depositPercent = Number(settings.deposit_percent || 50);
  const depositCents = Math.round(subtotalCents * depositPercent / 100);
  const validityDays = Number(settings.validity_days || 5);
  const validUntil = addDaysISO(validityDays);
  const markChanged = () => setSaved(false);

  const addItem = () => {
    const product = selectedOption?.product;
    const parsedQuantity = Number(quantity.replace(",", "."));
    if (!product) return toast.error("Escolha um produto.");
    if (!parsedQuantity || parsedQuantity <= 0) return toast.error("Informe uma quantidade válida.");
    if (product.minimumQuantity && parsedQuantity < product.minimumQuantity) return toast.error(`A quantidade mínima para este item é ${product.minimumQuantity}${product.unit === "kg" ? " kg" : " unidades"}.`);
    const totalCents = product.unit === "cento" ? Math.round(product.priceCents * parsedQuantity / 100) : Math.round(product.priceCents * parsedQuantity);
    setItems((current) => [...current, { id: makeId(), productId: product.id, productName: product.name, unit: product.unit, quantity: parsedQuantity, unitPriceCents: product.priceCents, totalCents }]);
    setSelectedOption(null); setProductQuery(""); setProductPickerOpen(false); setQuantity(""); markChanged(); toast.success(`${product.name} adicionado.`);
  };
  const removeItem = (id: string) => { setItems((current) => current.filter((item) => item.id !== id)); markChanged(); };
  const resetQuote = () => { setCustomerName(""); setCustomerPhone(""); setEventDate(""); setNotes(""); setItems([]); setSaved(false); setCurrentNumber(quoteNumber(quotes.length)); };
  const currentQuote = (): Quote => ({ id: makeId(), quoteNumber: currentNumber, customerName, customerPhone, eventDate: eventDate || null, validUntil, notes, subtotalCents, depositPercent, createdAt: new Date().toISOString(), items });
  const postAction = async (payload: Record<string, unknown>) => { const response = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível salvar."); return data; };
  const saveQuote = async () => {
    if (!customerName.trim()) return toast.error("Informe o nome do cliente.");
    if (!items.length) return toast.error("Adicione pelo menos um item.");
    setSaving(true);
    try { const quote = currentQuote(); await postAction({ action: "saveQuote", quote }); setQuotes((current) => [quote, ...current]); setSaved(true); toast.success("Orçamento salvo. Agora você pode imprimir ou enviar."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  };
  const messageText = () => [`Olá, ${customerName || "cliente"}! Segue o orçamento ${currentNumber} da Panificadora Dreon:`, "", ...items.map((item) => `• ${quantityLabel(item)} — ${item.productName}: ${money.format(item.totalCents / 100)}`), "", `Total: ${money.format(subtotalCents / 100)}`, `Sinal de ${depositPercent}%: ${money.format(depositCents / 100)}`, `Válido até ${formatDate(validUntil)}.`, "", settings.payment_note].filter(Boolean).join("\n");
  const copyMessage = async () => { await navigator.clipboard.writeText(messageText()); toast.success("Mensagem copiada para enviar ao cliente."); };
  const openWhatsApp = () => { const phone = customerPhone.replace(/\D/g, ""); const recipient = phone ? (phone.startsWith("55") ? phone : `55${phone}`) : ""; window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(messageText())}`, "_blank", "noopener,noreferrer"); };
  const saveSettings = async () => { setSaving(true); try { await postAction({ action: "saveSettings", settings }); toast.success("Dados da empresa atualizados."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setSaving(false); } };
  const openProduct = (product?: Product) => { setEditingProduct(product ? { ...product } : emptyProduct()); setProductDialog(true); };
  const saveProduct = async () => { setSaving(true); try { await postAction({ action: "saveProduct", product: editingProduct }); setProductDialog(false); await loadData(true); toast.success(editingProduct.id ? "Produto atualizado." : "Produto adicionado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setSaving(false); } };
  const toggleProduct = async (product: Product) => { try { await postAction({ action: "toggleProduct", id: product.id, active: !product.active }); setProducts((current) => current.map((item) => item.id === product.id ? { ...item, active: !item.active } : item)); toast.success(product.active ? "Produto desativado." : "Produto reativado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar o produto."); } };
  const duplicateQuote = (quote: Quote) => { setCustomerName(quote.customerName); setCustomerPhone(quote.customerPhone); setEventDate(quote.eventDate || ""); setNotes(quote.notes); setItems(quote.items.map((item) => ({ ...item, id: makeId() }))); setCurrentNumber(quoteNumber(quotes.length)); setSaved(false); setActiveTab("quote"); toast.success("Orçamento duplicado. Revise os dados e salve como novo."); };

  if (loading) return <main className="min-h-screen bg-[#f6f2ea] p-6"><div className="mx-auto max-w-7xl space-y-6"><Skeleton className="h-24 w-full rounded-3xl" /><div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><Skeleton className="h-[620px] rounded-3xl" /><Skeleton className="h-[620px] rounded-3xl" /></div></div></main>;

  return (
    <main className="min-h-screen bg-[#f6f2ea] text-[#2d241f]">
      <Toaster richColors position="top-right" />
      <div className="app-shell mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">
        <header className="mb-5 flex flex-col gap-4 rounded-[28px] border border-[#dfd3c3] bg-white px-5 py-4 shadow-[0_18px_60px_rgba(83,46,30,.08)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><img src={logoUrl} alt="Panificadora Dreon" className="h-14 w-auto sm:h-16" /><div className="border-l border-[#e3d8ca] pl-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a66d21]">Painel interno</p><h1 className="font-serif text-2xl font-bold text-[#651f1f] sm:text-3xl">Orçamentos</h1></div></div>
          <div className="flex items-center gap-2 text-sm text-[#6f6258]"><span className="size-2 rounded-full bg-emerald-500" />Catálogo atualizado em 03/2026</div>
        </header>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-[#ded1c0] bg-white p-1.5 shadow-sm">
            <TabsTrigger value="quote" className="min-h-11 px-4 data-[state=active]:bg-[#7a2525] data-[state=active]:text-white"><Calculator /> Novo orçamento</TabsTrigger>
            <TabsTrigger value="history" className="min-h-11 px-4 data-[state=active]:bg-[#7a2525] data-[state=active]:text-white"><History /> Histórico</TabsTrigger>
            <TabsTrigger value="products" className="min-h-11 px-4 data-[state=active]:bg-[#7a2525] data-[state=active]:text-white"><Store /> Produtos</TabsTrigger>
            <TabsTrigger value="settings" className="min-h-11 px-4 data-[state=active]:bg-[#7a2525] data-[state=active]:text-white"><Settings /> Dados da empresa</TabsTrigger>
          </TabsList>
          <TabsContent value="quote">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(520px,.95fr)]">
              <section className="space-y-5">
                <div className="panel-card">
                  <div className="mb-5 flex items-start justify-between gap-4"><div><p className="section-kicker">Etapa 1</p><h2 className="section-title">Dados do cliente</h2></div><Badge variant="secondary" className="bg-[#f3e8d8] text-[#7a4b1e]">{currentNumber}</Badge></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome do cliente *"><Input value={customerName} onChange={(e) => { setCustomerName(e.target.value); markChanged(); }} placeholder="Ex.: Maria Aparecida" /></Field>
                    <Field label="WhatsApp"><Input value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); markChanged(); }} placeholder="(41) 99999-9999" inputMode="tel" /></Field>
                    <Field label="Data do evento ou retirada"><Input type="date" value={eventDate} onChange={(e) => { setEventDate(e.target.value); markChanged(); }} /></Field>
                    <Field label={`Validade do orçamento (${validityDays} dias)`}><Input value={formatDate(validUntil)} disabled /></Field>
                  </div>
                </div>
                <div className="panel-card">
                  <div className="mb-5"><p className="section-kicker">Etapa 2</p><h2 className="section-title">Adicionar produtos</h2></div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-end">
                    <Field label="Produto">
                      <Combobox<ProductOption> items={filteredProductOptions} filteredItems={filteredProductOptions} filter={null} value={selectedOption} onValueChange={setSelectedOption} inputValue={productQuery} onInputValueChange={setProductQuery} open={productPickerOpen} onOpenChange={setProductPickerOpen} itemToStringLabel={(o) => o.label} itemToStringValue={(o) => o.value} isItemEqualToValue={(o, v) => o.value === v.value}>
                        <ComboboxInput className="w-full" placeholder="Digite para buscar no cardápio..." showClear />
                        <ComboboxContent><ComboboxEmpty>Nenhum produto encontrado.</ComboboxEmpty><ComboboxList>{filteredProductOptions.map((option) => <ComboboxItem key={option.value} value={option}><span className="flex min-w-0 flex-col"><span className="truncate font-medium">{option.product.name}</span><span className="text-xs text-muted-foreground">{option.product.category} · {priceLabel(option.product)}</span></span></ComboboxItem>)}</ComboboxList></ComboboxContent>
                      </Combobox>
                    </Field>
                    <Field label={selectedOption?.product.unit === "kg" ? "Quantidade (kg)" : "Quantidade (un.)"}><Input value={quantity} onChange={(e) => setQuantity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder={selectedOption?.product.unit === "kg" ? "Ex.: 2,5" : "Ex.: 75"} inputMode="decimal" /></Field>
                    <Button onClick={addItem} className="h-10 bg-[#7a2525] hover:bg-[#641d1d]"><Plus /> Adicionar</Button>
                  </div>
                  {selectedOption?.product && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#6f6258]"><Badge variant="outline">{priceLabel(selectedOption.product)}</Badge>{selectedOption.product.minimumQuantity > 0 && <span>Mínimo: {selectedOption.product.minimumQuantity}{selectedOption.product.unit === "kg" ? " kg" : " unidades"}</span>}{selectedOption.product.description && <span>· {selectedOption.product.description}</span>}</div>}
                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#e5dacf]">
                    {items.length ? <Table><TableHeader className="bg-[#faf6f0]"><TableRow><TableHead>Produto</TableHead><TableHead>Quantidade</TableHead><TableHead>Preço-base</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.productName}</TableCell><TableCell>{quantityLabel(item)}</TableCell><TableCell>{priceLabel(item)}</TableCell><TableCell className="text-right font-semibold">{money.format(item.totalCents / 100)}</TableCell><TableCell><Button aria-label={`Remover ${item.productName}`} variant="ghost" size="icon-sm" onClick={() => removeItem(item.id)} className="text-[#a33a32]"><Trash2 /></Button></TableCell></TableRow>)}</TableBody></Table> : <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center text-[#7b6e64]"><PackagePlus className="size-7 text-[#bd8a3a]" /><p className="font-medium">Nenhum produto adicionado</p><p className="text-sm">Busque um item acima e informe a quantidade desejada.</p></div>}
                  </div>
                  <Field label="Observações do orçamento" className="mt-5"><Textarea value={notes} onChange={(e) => { setNotes(e.target.value); markChanged(); }} placeholder="Ex.: recheio escolhido, horário de retirada, alterações combinadas..." rows={3} /></Field>
                </div>
                <div className="flex flex-wrap gap-3 rounded-[24px] border border-[#ddcfbf] bg-white p-4 shadow-sm">
                  <Button onClick={saveQuote} disabled={saving || saved} className="bg-[#7a2525] hover:bg-[#641d1d]">{saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : <Save />}{saved ? "Orçamento salvo" : "Salvar orçamento"}</Button>
                  <Button variant="outline" onClick={() => window.print()} disabled={!items.length}><Printer /> Imprimir / PDF</Button><Button variant="outline" onClick={copyMessage} disabled={!items.length}><ClipboardCopy /> Copiar mensagem</Button><Button variant="outline" onClick={openWhatsApp} disabled={!items.length} className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"><MessageCircle /> WhatsApp</Button><Button variant="ghost" onClick={resetQuote} className="ml-auto"><RefreshCw /> Limpar</Button>
                </div>
              </section>
              <QuoteDocument number={currentNumber} customerName={customerName} customerPhone={customerPhone} eventDate={eventDate} validUntil={validUntil} items={items} notes={notes} subtotalCents={subtotalCents} depositPercent={depositPercent} depositCents={depositCents} settings={settings} />
            </div>
          </TabsContent>
          <TabsContent value="history"><HistoryPanel quotes={quotes} duplicateQuote={duplicateQuote} /></TabsContent>
          <TabsContent value="products"><ProductsPanel products={products} openProduct={openProduct} toggleProduct={toggleProduct} /></TabsContent>
          <TabsContent value="settings"><SettingsPanel settings={settings} setSettings={setSettings} saveSettings={saveSettings} saving={saving} /></TabsContent>
        </Tabs>
      </div>
      <ProductDialog open={productDialog} setOpen={setProductDialog} product={editingProduct} setProduct={setEditingProduct} saveProduct={saveProduct} saving={saving} />
    </main>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <div className={`grid gap-2 ${className}`}><Label>{label}</Label>{children}</div>; }
function SettingField({ label, name, settings, setSettings, type = "text" }: { label: string; name: string; settings: SettingsMap; setSettings: React.Dispatch<React.SetStateAction<SettingsMap>>; type?: string }) { return <Field label={label}><Input type={type} value={settings[name] || ""} onChange={(e) => setSettings((current) => ({ ...current, [name]: e.target.value }))} /></Field>; }
function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center text-[#786b61]"><div className="grid size-12 place-items-center rounded-full bg-[#f2e5d2] text-[#a66d21]">{icon}</div><h3 className="font-semibold text-[#3a2c26]">{title}</h3><p className="max-w-md text-sm">{text}</p></div>; }

function HistoryPanel({ quotes, duplicateQuote }: { quotes: Quote[]; duplicateQuote: (quote: Quote) => void }) {
  return <section className="panel-card"><div className="mb-5 flex items-center justify-between gap-4"><div><p className="section-kicker">Orçamentos salvos</p><h2 className="section-title">Histórico</h2></div><Badge variant="secondary">{quotes.length} orçamento{quotes.length === 1 ? "" : "s"}</Badge></div>{quotes.length ? <div className="overflow-hidden rounded-2xl border"><Table><TableHeader className="bg-[#faf6f0]"><TableRow><TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Evento</TableHead><TableHead>Validade</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{quotes.map((quote) => <TableRow key={quote.id}><TableCell className="font-mono text-xs">{quote.quoteNumber}</TableCell><TableCell><div className="font-medium">{quote.customerName}</div><div className="text-xs text-muted-foreground">{quote.customerPhone || "Sem telefone"}</div></TableCell><TableCell>{formatDate(quote.eventDate)}</TableCell><TableCell>{formatDate(quote.validUntil)}</TableCell><TableCell className="text-right font-semibold">{money.format(quote.subtotalCents / 100)}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => duplicateQuote(quote)}><FileText /> Duplicar</Button></TableCell></TableRow>)}</TableBody></Table></div> : <EmptyState icon={<History />} title="Nenhum orçamento salvo" text="Os orçamentos concluídos aparecerão aqui para consulta e reaproveitamento." />}</section>;
}

function ProductsPanel({ products, openProduct, toggleProduct }: { products: Product[]; openProduct: (product?: Product) => void; toggleProduct: (product: Product) => void }) {
  return <section className="panel-card"><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="section-kicker">Cardápio interno</p><h2 className="section-title">Produtos e preços</h2><p className="mt-1 text-sm text-[#74665c]">Valores importados do cardápio de março de 2026.</p></div><Button onClick={() => openProduct()} className="bg-[#7a2525] hover:bg-[#641d1d]"><Plus /> Novo produto</Button></div><div className="overflow-hidden rounded-2xl border"><Table><TableHeader className="bg-[#faf6f0]"><TableRow><TableHead>Cód.</TableHead><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Venda</TableHead><TableHead>Preço</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{products.map((product) => <TableRow key={product.id} className={!product.active ? "opacity-55" : ""}><TableCell className="font-mono text-xs">{product.code}</TableCell><TableCell><div className="font-medium">{product.name}</div>{product.description && <div className="max-w-lg truncate text-xs text-muted-foreground">{product.description}</div>}</TableCell><TableCell>{product.category}</TableCell><TableCell>{product.unit === "cento" ? "Por cento" : product.unit === "kg" ? "Por kg" : "Por unidade"}</TableCell><TableCell className="font-semibold">{money.format(product.priceCents / 100)}</TableCell><TableCell><Badge variant={product.active ? "default" : "secondary"} className={product.active ? "bg-emerald-700" : ""}>{product.active ? "Ativo" : "Inativo"}</Badge></TableCell><TableCell className="text-right"><div className="inline-flex gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Editar ${product.name}`} onClick={() => openProduct(product)}><Pencil /></Button><Button variant="ghost" size="sm" onClick={() => toggleProduct(product)}>{product.active ? "Desativar" : "Reativar"}</Button></div></TableCell></TableRow>)}</TableBody></Table></div></section>;
}

function SettingsPanel({ settings, setSettings, saveSettings, saving }: { settings: SettingsMap; setSettings: React.Dispatch<React.SetStateAction<SettingsMap>>; saveSettings: () => void; saving: boolean }) {
  return <section className="panel-card mx-auto max-w-4xl"><div className="mb-6"><p className="section-kicker">Personalização</p><h2 className="section-title">Dados da empresa e regras</h2><p className="mt-1 text-sm text-[#74665c]">Estas informações aparecem automaticamente em todos os novos orçamentos.</p></div><div className="grid gap-4 md:grid-cols-2"><SettingField label="Razão social" name="company_name" settings={settings} setSettings={setSettings} /><SettingField label="Nome fantasia" name="trade_name" settings={settings} setSettings={setSettings} /><SettingField label="CNPJ" name="cnpj" settings={settings} setSettings={setSettings} /><SettingField label="Telefone / WhatsApp" name="phone" settings={settings} setSettings={setSettings} /><SettingField label="E-mail" name="email" settings={settings} setSettings={setSettings} /><SettingField label="Endereço" name="address" settings={settings} setSettings={setSettings} /><SettingField label="Validade padrão (dias)" name="validity_days" settings={settings} setSettings={setSettings} type="number" /><SettingField label="Sinal para confirmação (%)" name="deposit_percent" settings={settings} setSettings={setSettings} type="number" /><SettingField label="Antecedência mínima (dias)" name="lead_time_days" settings={settings} setSettings={setSettings} type="number" /><Field label="Texto sobre pagamento" className="md:col-span-2"><Textarea value={settings.payment_note || ""} onChange={(e) => setSettings((current) => ({ ...current, payment_note: e.target.value }))} rows={4} /></Field></div><Button onClick={saveSettings} disabled={saving} className="mt-6 bg-[#7a2525] hover:bg-[#641d1d]">{saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar alterações</Button></section>;
}

function ProductDialog({ open, setOpen, product, setProduct, saveProduct, saving }: { open: boolean; setOpen: (value: boolean) => void; product: Product; setProduct: React.Dispatch<React.SetStateAction<Product>>; saveProduct: () => void; saving: boolean }) {
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{product.id ? "Editar produto" : "Novo produto"}</DialogTitle><DialogDescription>Defina como o item é vendido para o cálculo automático funcionar corretamente.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><Field label="Código"><Input value={product.code} onChange={(e) => setProduct({ ...product, code: e.target.value })} placeholder="Ex.: 7315" /></Field><Field label="Categoria"><Input value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} placeholder="Ex.: Salgados" /></Field><Field label="Nome" className="sm:col-span-2"><Input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} /></Field><Field label="Forma de venda"><Select value={product.unit} onValueChange={(value: Product["unit"]) => setProduct({ ...product, unit: value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kg">Por quilograma</SelectItem><SelectItem value="cento">Por cento (cálculo proporcional)</SelectItem><SelectItem value="unidade">Por unidade</SelectItem></SelectContent></Select></Field><Field label="Preço em reais"><Input value={(product.priceCents / 100).toFixed(2).replace(".", ",")} onChange={(e) => setProduct({ ...product, priceCents: Math.round(Number(e.target.value.replace(",", ".")) * 100) || 0 })} inputMode="decimal" /></Field><Field label={product.unit === "kg" ? "Quantidade mínima (kg)" : "Quantidade mínima (unidades)"}><Input type="number" min="0" step="0.01" value={product.minimumQuantity} onChange={(e) => setProduct({ ...product, minimumQuantity: Number(e.target.value) })} /></Field><Field label="Descrição / sabores" className="sm:col-span-2"><Textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} rows={3} /></Field></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={saveProduct} disabled={saving} className="bg-[#7a2525] hover:bg-[#641d1d]">{saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar produto</Button></DialogFooter></DialogContent></Dialog>;
}

function QuoteDocument({ number, customerName, customerPhone, eventDate, validUntil, items, notes, subtotalCents, depositPercent, depositCents, settings }: { number: string; customerName: string; customerPhone: string; eventDate: string; validUntil: string; items: QuoteItem[]; notes: string; subtotalCents: number; depositPercent: number; depositCents: number; settings: SettingsMap }) {
  return <aside className="quote-document sticky top-5 overflow-hidden rounded-[26px] border border-[#d8c8b3] bg-white shadow-[0_24px_70px_rgba(72,42,28,.14)]"><div className="h-2 bg-gradient-to-r from-[#6f1f24] via-[#b98a32] to-[#6f1f24]" /><div className="p-6 sm:p-8"><header className="flex items-start justify-between gap-5 border-b-2 border-[#8e6828] pb-6"><img src={logoUrl} alt="Panificadora Dreon" className="h-20 w-auto object-contain" /><div className="text-right"><p className="font-serif text-2xl font-bold uppercase tracking-wide text-[#6f1f24]">Orçamento</p><p className="mt-1 font-mono text-sm font-semibold text-[#7c6a5d]">{number}</p><p className="mt-2 text-xs text-[#7c6a5d]">Emitido em {formatDate(todayISO())}</p></div></header><div className="grid gap-5 border-b border-[#e6ddd2] py-5 text-sm sm:grid-cols-2"><div><p className="document-label">Cliente</p><p className="mt-1 text-base font-bold text-[#372721]">{customerName || "Nome do cliente"}</p><p className="text-[#6f6258]">{customerPhone || "Telefone não informado"}</p></div><div className="sm:text-right"><p className="document-label">Evento / retirada</p><p className="mt-1 font-semibold">{eventDate ? formatDate(eventDate) : "A combinar"}</p><p className="text-[#6f6258]">Válido até {formatDate(validUntil)}</p></div></div><div className="py-5"><table className="w-full border-collapse text-sm"><thead><tr className="border-b border-[#d9cdbc] text-left text-xs uppercase tracking-wide text-[#7b6a5d]"><th className="pb-3 font-semibold">Item</th><th className="pb-3 font-semibold">Qtd.</th><th className="pb-3 text-right font-semibold">Valor</th></tr></thead><tbody>{items.length ? items.map((item) => <tr key={item.id} className="border-b border-[#eee7de]"><td className="py-3 pr-3 font-medium">{item.productName}</td><td className="py-3 whitespace-nowrap text-[#675b52]">{quantityLabel(item)}</td><td className="py-3 text-right font-semibold">{money.format(item.totalCents / 100)}</td></tr>) : <tr><td colSpan={3} className="py-10 text-center text-[#8a7c72]">Os produtos adicionados aparecerão aqui.</td></tr>}</tbody></table></div><div className="ml-auto max-w-sm space-y-2 border-t-2 border-[#8e6828] pt-4"><div className="flex items-center justify-between text-base"><span>Total do orçamento</span><strong className="text-xl text-[#6f1f24]">{money.format(subtotalCents / 100)}</strong></div><div className="flex items-center justify-between rounded-xl bg-[#f6ecdc] px-4 py-3 text-sm text-[#5c3d22]"><span>Sinal de {depositPercent}%</span><strong>{money.format(depositCents / 100)}</strong></div></div>{notes && <div className="mt-5 rounded-xl border border-[#e3d7c8] bg-[#fcfaf7] p-4 text-sm"><p className="document-label">Observações</p><p className="mt-1 whitespace-pre-wrap text-[#5f534a]">{notes}</p></div>}<div className="mt-5 rounded-xl bg-[#6f1f24] p-4 text-sm leading-relaxed text-white"><strong>Confirmação da encomenda</strong><p className="mt-1 text-white/90">{settings.payment_note}</p><p className="mt-2 text-xs text-white/75">Pedidos para eventos devem ser feitos com no mínimo {settings.lead_time_days || 2} dias de antecedência.</p></div><footer className="mt-6 grid gap-2 border-t border-[#e4dbd0] pt-5 text-center text-xs text-[#74675d]"><p className="font-semibold text-[#4a352b]">{settings.company_name} · CNPJ {settings.cnpj}</p><p>{settings.address}</p><p>{settings.phone} · {settings.email}</p></footer></div></aside>;
}
