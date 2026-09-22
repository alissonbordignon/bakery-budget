import { defaultSettings, initialCatalog } from "@/lib/catalog";
import { getDatabase } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProductPayload = {
  id?: number;
  code: string;
  name: string;
  category: string;
  unit: "kg" | "cento" | "unidade";
  priceCents: number;
  minimumQuantity: number;
  description: string;
  active?: boolean;
};

type QuoteItemPayload = {
  id: string;
  productId: number | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

type QuotePayload = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  eventDate: string | null;
  validUntil: string;
  notes: string;
  subtotalCents: number;
  depositPercent: number;
  createdAt: string;
  items: QuoteItemPayload[];
};

function ensureSeeded() {
  const db = getDatabase();
  const productCount = db.prepare("SELECT COUNT(*) AS total FROM products").get() as { total: number };

  if (!productCount.total) {
    const now = new Date().toISOString();
    const insertProduct = db.prepare(`
      INSERT OR IGNORE INTO products
      (code, name, category, unit, price_cents, minimum_quantity, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    db.transaction(() => {
      for (const product of initialCatalog) {
        insertProduct.run(
          product.code,
          product.name,
          product.category,
          product.unit,
          product.priceCents,
          product.minimumQuantity,
          product.description,
          now,
          now,
        );
      }
    })();
  }

  const settingCount = db.prepare("SELECT COUNT(*) AS total FROM settings").get() as { total: number };
  if (!settingCount.total) {
    const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    db.transaction(() => {
      for (const [key, value] of Object.entries(defaultSettings)) insertSetting.run(key, value);
    })();
  }
}

function asProduct(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
    category: String(row.category),
    unit: String(row.unit),
    priceCents: Number(row.price_cents),
    minimumQuantity: Number(row.minimum_quantity),
    description: String(row.description ?? ""),
    active: Boolean(row.active),
  };
}

export async function GET() {
  try {
    ensureSeeded();
    const db = getDatabase();
    const productRows = db.prepare("SELECT * FROM products ORDER BY active DESC, category, name").all() as Array<Record<string, unknown>>;
    const settingRows = db.prepare("SELECT key, value FROM settings ORDER BY key").all() as Array<{ key: string; value: string }>;
    const quoteRows = db.prepare("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 100").all() as Array<Record<string, unknown>>;
    const itemRows = db.prepare("SELECT * FROM quote_items ORDER BY quote_id, product_name").all() as Array<Record<string, unknown>>;

    const settings = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));
    const quotes = quoteRows.map((row) => ({
      id: String(row.id),
      quoteNumber: String(row.quote_number),
      customerName: String(row.customer_name),
      customerPhone: String(row.customer_phone ?? ""),
      eventDate: row.event_date ? String(row.event_date) : null,
      validUntil: String(row.valid_until),
      notes: String(row.notes ?? ""),
      subtotalCents: Number(row.subtotal_cents),
      depositPercent: Number(row.deposit_percent),
      createdAt: String(row.created_at),
      items: itemRows
        .filter((item) => String(item.quote_id) === String(row.id))
        .map((item) => ({
          id: String(item.id),
          productId: item.product_id == null ? null : Number(item.product_id),
          productName: String(item.product_name),
          unit: String(item.unit),
          quantity: Number(item.quantity),
          unitPriceCents: Number(item.unit_price_cents),
          totalCents: Number(item.total_cents),
        })),
    }));

    return Response.json({ products: productRows.map(asProduct), settings, quotes });
  } catch (error) {
    console.error("Falha ao carregar dados", error);
    return Response.json({ error: "Não foi possível carregar os dados agora." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    ensureSeeded();
    const db = getDatabase();
    const body = (await request.json()) as { action: string; [key: string]: unknown };

    if (body.action === "saveSettings") {
      const settings = body.settings as Record<string, string>;
      const saveSetting = db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      db.transaction(() => {
        for (const [key, value] of Object.entries(settings)) saveSetting.run(key, String(value));
      })();
      return Response.json({ ok: true });
    }

    if (body.action === "saveProduct") {
      const product = body.product as ProductPayload;
      const now = new Date().toISOString();
      if (!product.name?.trim() || !product.category?.trim() || !product.priceCents) {
        return Response.json({ error: "Preencha nome, categoria e preço." }, { status: 400 });
      }

      if (product.id) {
        db.prepare(`
          UPDATE products SET code = ?, name = ?, category = ?, unit = ?, price_cents = ?,
          minimum_quantity = ?, description = ?, active = ?, updated_at = ? WHERE id = ?
        `).run(
          product.code,
          product.name.trim(),
          product.category.trim(),
          product.unit,
          Math.round(product.priceCents),
          Number(product.minimumQuantity || 0),
          product.description || "",
          product.active === false ? 0 : 1,
          now,
          product.id,
        );
      } else {
        db.prepare(`
          INSERT INTO products
          (code, name, category, unit, price_cents, minimum_quantity, description, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).run(
          product.code || `NOVO-${Date.now()}`,
          product.name.trim(),
          product.category.trim(),
          product.unit,
          Math.round(product.priceCents),
          Number(product.minimumQuantity || 0),
          product.description || "",
          now,
          now,
        );
      }
      return Response.json({ ok: true });
    }

    if (body.action === "toggleProduct") {
      db.prepare("UPDATE products SET active = ?, updated_at = ? WHERE id = ?")
        .run(body.active ? 1 : 0, new Date().toISOString(), Number(body.id));
      return Response.json({ ok: true });
    }

    if (body.action === "saveQuote") {
      const quote = body.quote as QuotePayload;
      if (!quote.customerName?.trim() || !quote.items?.length) {
        return Response.json({ error: "Informe o cliente e adicione pelo menos um item." }, { status: 400 });
      }

      const insertQuote = db.prepare(`
        INSERT INTO quotes
        (id, quote_number, customer_name, customer_phone, event_date, valid_until, notes, subtotal_cents, deposit_percent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertItem = db.prepare(`
        INSERT INTO quote_items
        (id, quote_id, product_id, product_name, unit, quantity, unit_price_cents, total_cents)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      db.transaction(() => {
        insertQuote.run(
          quote.id,
          quote.quoteNumber,
          quote.customerName.trim(),
          quote.customerPhone || "",
          quote.eventDate || null,
          quote.validUntil,
          quote.notes || "",
          Math.round(quote.subtotalCents),
          Number(quote.depositPercent),
          quote.createdAt,
        );
        for (const item of quote.items) {
          insertItem.run(
            item.id,
            quote.id,
            item.productId,
            item.productName,
            item.unit,
            Number(item.quantity),
            Math.round(item.unitPriceCents),
            Math.round(item.totalCents),
          );
        }
      })();
      return Response.json({ ok: true, quote });
    }

    return Response.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    console.error("Falha ao salvar dados", error);
    const message = error instanceof Error && error.message.includes("UNIQUE")
      ? "Já existe um registro com este código."
      : "Não foi possível salvar agora.";
    return Response.json({ error: message }, { status: 500 });
  }
}
