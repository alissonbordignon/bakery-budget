export type CatalogProduct = {
  code: string;
  name: string;
  category: string;
  unit: "kg" | "cento" | "unidade";
  priceCents: number;
  minimumQuantity: number;
  description: string;
};

export const defaultSettings: Record<string, string> = {
  company_name: "Dreon & Cia Ltda.",
  trade_name: "Panificadora Dreon",
  cnpj: "85.058.790/0001-19",
  phone: "(41) 3019-5841",
  email: "financeiro@panificadoradreon.com.br",
  address: "Rua Fernando de Noronha, 301 - Boa Vista - Curitiba/PR",
  validity_days: "5",
  deposit_percent: "50",
  lead_time_days: "2",
  payment_note: "Para efetivar a encomenda, é necessário o pagamento de 50% de sinal. O saldo deverá ser pago na retirada.",
};

export const initialCatalog: CatalogProduct[] = [
  { code: "50", name: "Bolos Secos e Cremosos", category: "Bolos", unit: "kg", priceCents: 4490, minimumQuantity: 1, description: "Aipim, Banana, Cenoura, Fubá, Laranja ou Milho" },
  { code: "150", name: "Bolo Abacaxi com Coco", category: "Bolos", unit: "kg", priceCents: 6990, minimumQuantity: 1, description: "Abacaxi, brigadeiro branco com coco e chantilly" },
  { code: "151", name: "Bolo Brigadeiro", category: "Bolos", unit: "kg", priceCents: 6490, minimumQuantity: 1, description: "Brigadeiro, ganache, granulados e chantilly" },
  { code: "40", name: "Bolo Dois Amores", category: "Bolos", unit: "kg", priceCents: 6490, minimumQuantity: 1, description: "Brigadeiro preto e branco" },
  { code: "152", name: "Bolo Ferrero Rocher", category: "Bolos", unit: "kg", priceCents: 8990, minimumQuantity: 1, description: "Chocolate com avelã e Ferrero Rocher" },
  { code: "153", name: "Bolo Floresta Negra", category: "Bolos", unit: "kg", priceCents: 6990, minimumQuantity: 1, description: "Brigadeiro preto com cerejas" },
  { code: "155", name: "Bolo Kit Kat", category: "Bolos", unit: "kg", priceCents: 8990, minimumQuantity: 1, description: "Brigadeiro, Kit Kat e confetes" },
  { code: "156", name: "Bolo Marta Rocha", category: "Bolos", unit: "kg", priceCents: 7490, minimumQuantity: 1, description: "Damasco, baba de moça, nozes, ameixa e suspiro" },
  { code: "157", name: "Bolo Morango", category: "Bolos", unit: "kg", priceCents: 6990, minimumQuantity: 1, description: "Brigadeiro branco com morango" },
  { code: "158", name: "Bolo Nega Maluca", category: "Bolos", unit: "kg", priceCents: 4990, minimumQuantity: 1, description: "Bolo de chocolate úmido com doce de leite" },
  { code: "159", name: "Bolo Prestígio", category: "Bolos", unit: "kg", priceCents: 6990, minimumQuantity: 1, description: "Brigadeiro branco e prestígio" },
  { code: "160", name: "Bolo Sensação Preto ou Branco", category: "Bolos", unit: "kg", priceCents: 6490, minimumQuantity: 1, description: "Brigadeiro com morango" },
  { code: "161", name: "Bolo Sonho de Valsa", category: "Bolos", unit: "kg", priceCents: 6990, minimumQuantity: 1, description: "Brigadeiros branco e preto com Sonho de Valsa" },
  { code: "162", name: "Bolo Sonho de Valsa com Morango", category: "Bolos", unit: "kg", priceCents: 7990, minimumQuantity: 1, description: "Sonho de Valsa, brigadeiro e morango" },
  { code: "163", name: "Torta Alemã", category: "Tortas", unit: "kg", priceCents: 5990, minimumQuantity: 1, description: "" },
  { code: "164", name: "Torta de Banana", category: "Tortas", unit: "kg", priceCents: 4990, minimumQuantity: 1, description: "" },
  { code: "61", name: "Cuque", category: "Tortas", unit: "kg", priceCents: 4990, minimumQuantity: 1, description: "" },
  { code: "165", name: "Torta de Limão", category: "Tortas", unit: "kg", priceCents: 4990, minimumQuantity: 1, description: "" },
  { code: "166", name: "Torta de Maçã", category: "Tortas", unit: "kg", priceCents: 4990, minimumQuantity: 1, description: "" },
  { code: "167", name: "Torta de Maracujá", category: "Tortas", unit: "kg", priceCents: 4990, minimumQuantity: 1, description: "" },
  { code: "168", name: "Torta de Morango", category: "Tortas", unit: "kg", priceCents: 5990, minimumQuantity: 1, description: "" },
  { code: "169", name: "Torta de Requeijão", category: "Tortas", unit: "kg", priceCents: 4990, minimumQuantity: 1, description: "" },
  { code: "357", name: "Banoffe", category: "Tortas", unit: "kg", priceCents: 5990, minimumQuantity: 1, description: "" },
  { code: "7300", name: "Beijinho", category: "Doces", unit: "cento", priceCents: 13490, minimumQuantity: 50, description: "" },
  { code: "7301", name: "Bombom", category: "Doces", unit: "cento", priceCents: 24990, minimumQuantity: 50, description: "Ameixa, cereja, coco, morango, nozes, uva e outros sabores" },
  { code: "7302", name: "Brigadeiro", category: "Doces", unit: "cento", priceCents: 13490, minimumQuantity: 50, description: "" },
  { code: "7303", name: "Cajuzinho", category: "Doces", unit: "cento", priceCents: 13490, minimumQuantity: 50, description: "" },
  { code: "7304", name: "Camafeu", category: "Doces", unit: "cento", priceCents: 26990, minimumQuantity: 50, description: "" },
  { code: "7305", name: "Dois Amores", category: "Doces", unit: "cento", priceCents: 13490, minimumQuantity: 50, description: "" },
  { code: "7306", name: "Espelhado", category: "Doces", unit: "cento", priceCents: 29990, minimumQuantity: 50, description: "Abacaxi, ameixa, amendoim, castanha, coco, damasco, morango ou uva" },
  { code: "7307", name: "Mini Churros de Doce de Leite", category: "Doces", unit: "cento", priceCents: 14990, minimumQuantity: 50, description: "" },
  { code: "7308", name: "Mini Sonho", category: "Doces", unit: "cento", priceCents: 21990, minimumQuantity: 50, description: "Doce de leite ou creme" },
  { code: "7309", name: "Moranguetti", category: "Doces", unit: "cento", priceCents: 22990, minimumQuantity: 50, description: "" },
  { code: "7310", name: "Olho de Sogra", category: "Doces", unit: "cento", priceCents: 13490, minimumQuantity: 50, description: "" },
  { code: "7311", name: "Quindim", category: "Doces", unit: "cento", priceCents: 23990, minimumQuantity: 50, description: "" },
  { code: "7312", name: "Barquete de Atum ou Camarão", category: "Salgados", unit: "cento", priceCents: 29990, minimumQuantity: 50, description: "" },
  { code: "7313", name: "Barquete de Frango ou Palmito", category: "Salgados", unit: "cento", priceCents: 19990, minimumQuantity: 50, description: "" },
  { code: "7314", name: "Bolinha de Queijo", category: "Salgados", unit: "cento", priceCents: 12990, minimumQuantity: 50, description: "" },
  { code: "7315", name: "Coxinha de Frango", category: "Salgados", unit: "cento", priceCents: 12990, minimumQuantity: 50, description: "" },
  { code: "7316", name: "Croissant", category: "Salgados", unit: "cento", priceCents: 19990, minimumQuantity: 50, description: "Frango, queijo, frios ou chocolate" },
  { code: "7317", name: "Croquete Frito", category: "Salgados", unit: "cento", priceCents: 12990, minimumQuantity: 50, description: "Presunto com queijo ou salsicha" },
  { code: "7318", name: "Doguinho", category: "Salgados", unit: "cento", priceCents: 12990, minimumQuantity: 50, description: "" },
  { code: "7319", name: "Empadinha de Frango ou Palmito", category: "Salgados", unit: "cento", priceCents: 13990, minimumQuantity: 50, description: "" },
  { code: "7320", name: "Empadão de Forma - Frango ou Palmito", category: "Salgados", unit: "kg", priceCents: 5490, minimumQuantity: 2, description: "Pedido mínimo de 2 kg" },
  { code: "7321", name: "Esfirra", category: "Salgados", unit: "cento", priceCents: 13990, minimumQuantity: 50, description: "Carne, frango ou frios" },
  { code: "7322", name: "Folhado", category: "Salgados", unit: "cento", priceCents: 16990, minimumQuantity: 50, description: "Calabresa, frango, frios, palmito, ricota ou salsicha" },
  { code: "7323", name: "Kibe", category: "Salgados", unit: "cento", priceCents: 12990, minimumQuantity: 50, description: "" },
  { code: "7324", name: "Kibe com Queijo", category: "Salgados", unit: "cento", priceCents: 13990, minimumQuantity: 50, description: "" },
  { code: "7325", name: "Mini Pastéis", category: "Salgados", unit: "cento", priceCents: 14990, minimumQuantity: 50, description: "Carne, pizza ou queijo" },
  { code: "7326", name: "Risoles de Carne", category: "Salgados", unit: "cento", priceCents: 13490, minimumQuantity: 50, description: "" },
  { code: "7327", name: "Risoles de Palmito", category: "Salgados", unit: "cento", priceCents: 13990, minimumQuantity: 50, description: "" },
  { code: "7328", name: "Mini Sanduíche", category: "Sanduíches", unit: "cento", priceCents: 32990, minimumQuantity: 50, description: "Pães variados; frios, salame italiano ou frango" },
  { code: "7329", name: "Sanduíche Evento 70 cm", category: "Sanduíches", unit: "unidade", priceCents: 13990, minimumQuantity: 1, description: "Pão francês, parmesão ou ciabatta; frios, salame italiano ou frango" },
];
