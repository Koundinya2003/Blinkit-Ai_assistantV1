"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Banknote, CreditCard, Loader2, MapPin, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import { productArt } from "@/lib/product-image";
import { useCartEntries, useCartStore, useCartTotals } from "@/lib/store/cart-store";
import { loadAddress, newOrderId, saveAddress, saveOrder, type DeliveryAddress } from "@/lib/shop/orders";
import { cn } from "@/lib/utils";

const addressSchema = z.object({
  name: z.string().min(2, "Tell us your name"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  line1: z.string().min(1, "Flat or house number is required"),
  line2: z.string().min(3, "Street or area is required"),
  city: z.string().min(2, "City is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
  label: z.enum(["Home", "Work", "Other"]),
});

type AddressForm = z.infer<typeof addressSchema>;

const PAYMENTS = [
  { id: "upi", label: "UPI", detail: "Pay by any UPI app", icon: Smartphone },
  { id: "card", label: "Card", detail: "Credit or debit card", icon: CreditCard },
  { id: "cod", label: "Cash on delivery", detail: "Pay the rider", icon: Banknote },
] as const;

export function CheckoutView() {
  const router = useRouter();
  const entries = useCartEntries();
  const totals = useCartTotals();
  const clear = useCartStore((state) => state.clear);
  const hydrated = useCartStore((state) => state.hydrated);

  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]["id"]>("upi");
  const [placing, setPlacing] = useState(false);

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "Bengaluru",
      pincode: "",
      label: "Home",
    },
  });

  // Reuse the address from the shopper's last order.
  useEffect(() => {
    const saved = loadAddress();
    if (saved) form.reset({ ...saved, label: (saved.label as AddressForm["label"]) ?? "Home" });
  }, [form]);

  if (hydrated && entries.length === 0 && !placing) {
    return (
      <EmptyState
        emoji="🛒"
        title="Nothing to check out"
        description="Your cart is empty. Describe a meal and Blinkit will fill it for you."
        action={
          <Link href="/plan">
            <Button>Build a basket</Button>
          </Link>
        }
      />
    );
  }

  const placeOrder = form.handleSubmit((address) => {
    setPlacing(true);
    const order = {
      id: newOrderId(),
      placedAt: new Date().toISOString(),
      etaMinutes: 11,
      items: entries.map(({ product, quantity }) => ({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        pack: product.pack,
        quantity,
        unitPrice: product.price,
      })),
      totals,
      address: address as DeliveryAddress,
      paymentMethod: payment,
    };
    saveAddress(address as DeliveryAddress);
    saveOrder(order);
    clear();
    router.push(`/order/${order.id}`);
  });

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Continue shopping
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <form onSubmit={placeOrder} className="space-y-4">
          <section className="surface-card p-5">
            <h1 className="flex items-center gap-2 text-lg font-bold">
              <MapPin className="h-5 w-5 text-primary" aria-hidden />
              Delivery address
            </h1>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Full name" error={form.formState.errors.name?.message}>
                <input {...form.register("name")} className={inputClass} autoComplete="name" />
              </Field>
              <Field label="Mobile number" error={form.formState.errors.phone?.message}>
                <input {...form.register("phone")} className={inputClass} inputMode="numeric" autoComplete="tel" />
              </Field>
              <Field label="Flat / house number" error={form.formState.errors.line1?.message}>
                <input {...form.register("line1")} className={inputClass} />
              </Field>
              <Field label="Street / area" error={form.formState.errors.line2?.message}>
                <input {...form.register("line2")} className={inputClass} />
              </Field>
              <Field label="City" error={form.formState.errors.city?.message}>
                <input {...form.register("city")} className={inputClass} />
              </Field>
              <Field label="Pincode" error={form.formState.errors.pincode?.message}>
                <input {...form.register("pincode")} className={inputClass} inputMode="numeric" />
              </Field>
            </div>

            <fieldset className="mt-4">
              <legend className="text-xs font-semibold text-muted-foreground">Save as</legend>
              <div className="mt-2 flex gap-2">
                {(["Home", "Work", "Other"] as const).map((label) => (
                  <label
                    key={label}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      form.watch("label") === label ? "border-primary bg-primary/10 text-primary" : "border-border"
                    )}
                  >
                    <input type="radio" value={label} {...form.register("label")} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-lg font-bold">Payment method</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {PAYMENTS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPayment(option.id)}
                    aria-pressed={payment === option.id}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      payment === option.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    <p className="mt-2 text-sm font-bold">{option.label}</p>
                    <p className="text-[11px] text-muted-foreground">{option.detail}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <Button type="submit" size="lg" className="w-full" disabled={placing || entries.length === 0}>
            {placing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {placing ? "Placing order…" : `Place order · ${formatCurrency(totals.total)}`}
          </Button>
        </form>

        <aside className="surface-card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-bold">Order summary</h2>

          <ul className="mt-3 max-h-64 space-y-2.5 overflow-y-auto">
            {entries.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center gap-2.5">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  <Image src={productArt(product)} alt="" fill sizes="40px" className="object-cover" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {quantity} × {product.pack}
                  </p>
                </div>
                <span className="text-xs font-bold tabular-nums">{formatCurrency(product.price * quantity)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
            <SummaryRow label="Items total" value={formatCurrency(totals.subtotal)} />
            <SummaryRow
              label="Delivery"
              value={totals.delivery === 0 ? "FREE" : formatCurrency(totals.delivery)}
              accent={totals.delivery === 0}
            />
            <SummaryRow label="Handling" value={formatCurrency(totals.handling)} />
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>To pay</dt>
              <dd className="tabular-nums">{formatCurrency(totals.total)}</dd>
            </div>
          </dl>

          {totals.savings > 0 && (
            <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              You saved {formatCurrency(totals.savings)} on this order
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1 h-10 w-full rounded-[10px] border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      {children}
      {error && <span className="mt-1 block text-[11px] font-medium text-danger">{error}</span>}
    </label>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", accent && "font-semibold text-primary")}>{value}</dd>
    </div>
  );
}
