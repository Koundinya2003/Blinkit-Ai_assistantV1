"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, CreditCard, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/shop/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/firebase/auth";
import {
  getUserAddresses,
  addUserAddress,
  deleteUserAddress,
  setDefaultAddress
} from "@/lib/firebase/addresses";
import { getCartTotals } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { UserAddress } from "@/lib/types";

const checkoutSchema = z.object({
  addressId: z.string().min(1, "Please select a delivery address"),
  paymentMethod: z.enum(["upi", "card", "cod"])
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const addressFormSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number"),
  house: z.string().min(1, "Enter house/flat number"),
  street: z.string().min(1, "Enter street address"),
  landmark: z.string().optional(),
  city: z.string().min(1, "Enter city"),
  state: z.string().min(1, "Enter state"),
  postalCode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  label: z.enum(["Home", "Work", "Other"])
});

type AddressForm = z.infer<typeof addressFormSchema>;

export function CheckoutExperience() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const cart = items.map(item => ({ productId: item.productId, quantity: item.quantity }));
  const totals = getCartTotals(cart);
  
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      addressId: "",
      paymentMethod: "cod"
    }
  });

  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      house: "",
      street: "",
      landmark: "",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "",
      label: "Home"
    }
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/");
      return;
    }

    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const loadAddresses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const userAddresses = await getUserAddresses(user.id);
      setAddresses(userAddresses);

      // Select default address or first address
      const defaultAddr = userAddresses.find(addr => addr.isDefault) || userAddresses[0] || null;
      setSelectedAddress(defaultAddr);
      
      if (defaultAddr) {
        form.setValue("addressId", defaultAddr.id);
      }
    } catch (err) {
      console.error("Error loading addresses:", err);
      setError("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (values: AddressForm) => {
    if (!user) return;

    try {
      setError(null);
      const newAddress = await addUserAddress(user.id, {
        label: values.label,
        line1: values.house,
        line2: values.street,
        city: values.city,
        state: values.state,
        pincode: values.postalCode,
        phone: values.phone,
        isDefault: addresses.length === 0
      });

      setAddresses([...addresses, newAddress]);
      setSelectedAddress(newAddress);
      form.setValue("addressId", newAddress.id);
      setShowAddressForm(false);
      addressForm.reset();
    } catch (err) {
      console.error("Error adding address:", err);
      setError("Failed to add address");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user || !confirm("Are you sure you want to delete this address?")) return;

    try {
      await deleteUserAddress(user.id, addressId);
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      setAddresses(updatedAddresses);

      if (selectedAddress?.id === addressId) {
        const newSelected = updatedAddresses.find(addr => addr.isDefault) || updatedAddresses[0] || null;
        setSelectedAddress(newSelected);
        form.setValue("addressId", newSelected?.id || "");
      }
    } catch (err) {
      console.error("Error deleting address:", err);
      setError("Failed to delete address");
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) return;

    try {
      await setDefaultAddress(user.id, addressId);
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));
      setAddresses(updatedAddresses);
    } catch (err) {
      console.error("Error setting default address:", err);
      setError("Failed to set default address");
    }
  };

  const onSubmit = async (values: CheckoutForm) => {
    if (!user || !selectedAddress || cart.length === 0) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          addressId: values.addressId,
          deliveryAddress: selectedAddress,
          paymentMethod: values.paymentMethod,
          cart: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      // Clear cart
      await clearCart();

      // Navigate to order confirmation
      router.push(`/orders?orderId=${data.orderId}`);
    } catch (err) {
      console.error("Error placing order:", err);
      setError(err instanceof Error ? err.message : "Failed to place order");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-4">
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to shopping
        </Link>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-5 md:grid-cols-[1fr_360px]">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Delivery Address Section */}
            <section className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-black">Delivery address</h1>
                </div>
                {!showAddressForm && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddressForm(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add new
                  </Button>
                )}
              </div>

              {/* Address List */}
              {!showAddressForm && (
                <div className="mt-4 space-y-3">
                  {addresses.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                      <p className="text-sm text-muted-foreground">No addresses saved</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowAddressForm(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Add your first address
                      </Button>
                    </div>
                  ) : (
                    addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`relative rounded-lg border-2 p-4 transition-all ${
                          selectedAddress?.id === address.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="addressId"
                                checked={selectedAddress?.id === address.id}
                                onChange={() => {
                                  setSelectedAddress(address);
                                  form.setValue("addressId", address.id);
                                }}
                                className="h-4 w-4"
                              />
                              <span className="text-sm font-black">{address.label}</span>
                              {address.isDefault && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="mt-2 ml-6">
                              <p className="text-sm font-bold">{address.line1}</p>
                              {address.line2 && <p className="text-sm text-muted-foreground">{address.line2}</p>}
                              <p className="text-sm text-muted-foreground">
                                {address.city}, {address.state} - {address.pincode}
                              </p>
                              <p className="text-sm text-muted-foreground">Phone: {address.phone}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!address.isDefault && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefault(address.id)}
                              >
                                Set default
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAddress(address.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add Address Form */}
              {showAddressForm && (
                <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
                  <h3 className="text-lg font-black">Add new address</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold">
                      Full name
                      <Input className="mt-2" {...addressForm.register("name")} />
                      <span className="mt-1 block text-xs text-red-600">{addressForm.formState.errors.name?.message}</span>
                    </label>
                    <label className="text-sm font-bold">
                      Mobile number
                      <Input className="mt-2" inputMode="numeric" {...addressForm.register("phone")} />
                      <span className="mt-1 block text-xs text-red-600">{addressForm.formState.errors.phone?.message}</span>
                    </label>
                  </div>
                  <label className="text-sm font-bold">
                    House/Flat number
                    <Input className="mt-2" {...addressForm.register("house")} />
                    <span className="mt-1 block text-xs text-red-600">{addressForm.formState.errors.house?.message}</span>
                  </label>
                  <label className="text-sm font-bold">
                    Street address
                    <Input className="mt-2" {...addressForm.register("street")} />
                    <span className="mt-1 block text-xs text-red-600">{addressForm.formState.errors.street?.message}</span>
                  </label>
                  <label className="text-sm font-bold">
                    Landmark (optional)
                    <Input className="mt-2" {...addressForm.register("landmark")} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-bold">
                      City
                      <Input className="mt-2" {...addressForm.register("city")} />
                      <span className="mt-1 block text-xs text-red-600">{addressForm.formState.errors.city?.message}</span>
                    </label>
                    <label className="text-sm font-bold">
                      State
                      <Input className="mt-2" {...addressForm.register("state")} />
                      <span className="mt-1 block text-xs text-red-600">{addressForm.formState.errors.state?.message}</span>
                    </label>
                    <label className="text-sm font-bold">
                      Pincode
                      <Input className="mt-2" inputMode="numeric" {...addressForm.register("postalCode")} />
                      <span className="mt-1 block text-xs text-red-600">{addressForm.formState.errors.postalCode?.message}</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowAddressForm(false);
                        addressForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="button" onClick={addressForm.handleSubmit(handleAddAddress)}>
                      Save address
                    </Button>
                  </div>
                </div>
              )}

              {form.formState.errors.addressId && (
                <p className="mt-2 text-xs text-red-600">{form.formState.errors.addressId.message}</p>
              )}
            </section>

            {/* Payment Section */}
            <section className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#2563eb]" />
                <h2 className="text-xl font-black">Payment method</h2>
              </div>
              <Controller
                name="paymentMethod"
                control={form.control}
                render={({ field }) => (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[
                      ["cod", "Cash on Delivery"],
                      ["upi", "UPI"],
                      ["card", "Card"]
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={`rounded-md border p-3 text-left text-sm font-black transition-all ${
                          field.value === value
                            ? "border-primary bg-[#dcfce7]"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </section>

            <Button
              type="submit"
              disabled={!selectedAddress || cart.length === 0 || submitting}
              className="w-full"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Placing order..." : "Place order"}
            </Button>
          </form>

          {/* Order Summary */}
          <aside className="h-fit rounded-lg bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">Order summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Item total ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{totals.delivery ? formatCurrency(totals.delivery) : "FREE"}</span>
              </div>
              <div className="flex justify-between">
                <span>Handling</span>
                <span>{formatCurrency(totals.handling)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span>{formatCurrency(totals.gst)}</span>
              </div>
              {totals.savings > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(totals.savings)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 text-base font-black flex justify-between">
                <span>To pay</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
            {totals.savings > 0 && (
              <p className="mt-3 rounded-md bg-[#dcfce7] p-3 text-sm font-bold text-primary">
                You save {formatCurrency(totals.savings)} on this order
              </p>
            )}
            {selectedAddress && (
              <div className="mt-4 rounded-lg bg-muted p-3">
                <p className="text-xs font-bold text-muted-foreground">DELIVERING TO</p>
                <p className="mt-1 text-sm font-black">{selectedAddress.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedAddress.line1}, {selectedAddress.city}
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}