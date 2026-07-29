import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  Clock, 
  ShieldCheck, 
  Star,
  Heart,
  Share2,
  Truck,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { Header } from "@/components/shop/header";
import { ProductCard } from "@/components/shop/product-card";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { getProductBySlugWithFallback, getProductsWithFallback } from "@/lib/data-service";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlugWithFallback(slug);
  
  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found."
    };
  }

  return {
    title: `${product.name} - ${product.brand}`,
    description: product.description,
    keywords: [product.name, product.brand, product.category, ...product.tags],
    openGraph: {
      title: `${product.name} - ${product.brand}`,
      description: product.description,
      images: [
        {
          url: product.image,
          width: 800,
          height: 800,
          alt: `${product.brand} ${product.name}`
        }
      ],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} - ${product.brand}`,
      description: product.description,
      images: [product.image]
    }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlugWithFallback(slug);
  if (!product) notFound();

  const allProducts = await getProductsWithFallback();
  // Prioritize same category first, then same subcategory, then related tags
  const related = allProducts
    .filter((item) => item.id !== product.id)
    .map((item) => {
      let score = 0;
      if (item.category === product.category) score += 10;
      if (item.subcategory === product.subcategory) score += 5;
      if (item.brand === product.brand) score += 3;
      // Only count tag matches if same category
      if (item.category === product.category) {
        const sharedTags = item.tags.filter(tag => product.tags.includes(tag));
        score += sharedTags.length * 2;
      }
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ item }) => item);

  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const hasDiscount = discount > 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-smooth">
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href={`/?category=${product.category}`} className="text-muted-foreground hover:text-primary transition-smooth">
            {product.category}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground line-clamp-1">{product.name}</span>
        </nav>

        {/* Product Hero Section */}
        <section className="mt-4 grid gap-6 rounded-2xl bg-white p-4 shadow-card md:grid-cols-[440px_1fr] md:p-6 animate-fade-in">
          {/* Image Gallery */}
          <div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-muted/30 to-muted/10">
            <Image 
              src={product.image} 
              alt={product.name} 
              fill 
              sizes="(max-width: 768px) 100vw, 440px" 
              className="object-cover" 
              priority 
            />
            {hasDiscount && (
              <div className="absolute left-3 top-3">
                <span className="badge-discount text-xs px-3 py-1.5">
                  {discount}% OFF
                </span>
              </div>
            )}
            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <button 
                className="rounded-full bg-white/90 p-2.5 shadow-md transition-smooth hover:scale-110 hover:bg-white"
                aria-label="Add to wishlist"
              >
                <Heart className="h-5 w-5 text-muted-foreground" />
              </button>
              <button 
                className="rounded-full bg-white/90 p-2.5 shadow-md transition-smooth hover:scale-110 hover:bg-white"
                aria-label="Share product"
              >
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            {/* Delivery Badge */}
            <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 border border-green-200">
              <Clock className="h-4 w-4" />
              Delivery in {product.deliveryMinutes} minutes
            </div>

            {/* Product Name */}
            <h1 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">{product.name}</h1>
            
            {/* Brand and Unit */}
            <p className="mt-2 text-sm text-muted-foreground">{product.brand} · {product.unit}</p>

            {/* Rating */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold">{product.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {product.reviews.toLocaleString("en-IN")} reviews
              </span>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{product.description}</p>

            {/* Price Section */}
            <div className="mt-6 rounded-xl border border-border p-4 bg-gradient-to-br from-muted/20 to-transparent">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-foreground">
                      {formatCurrency(product.price)}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-base text-muted-foreground line-through">
                          {formatCurrency(product.mrp)}
                        </span>
                        <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                          Save {formatCurrency(product.mrp - product.price)} ({discount}%)
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Inclusive of all taxes
                  </p>
                </div>
                <div className="hidden sm:block">
                  <QuantityStepper productId={product.id} />
                </div>
              </div>
              {/* Mobile quantity stepper */}
              <div className="mt-4 sm:hidden">
                <QuantityStepper productId={product.id} />
              </div>
            </div>

            {/* Delivery & Quality Info */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/30 p-4 border border-border">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black">Express Delivery</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Delivered from a nearby store in {product.deliveryMinutes} minutes
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-muted/30 p-4 border border-border">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black">Quality Assured</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Stored and dispatched from a trusted partner dark store
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="mt-4 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 p-4 border border-purple-200/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-black">AI Insights</p>
                  <p className="text-xs text-muted-foreground">Smart recommendations</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg bg-white p-3">
                  <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold">Why we recommend this</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Popular among customers buying {product.category.toLowerCase()} items. High rating and fast delivery.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-white p-3">
                  <TrendingUp className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold">Best value</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {discount > 0 ? `${discount}% discount available. Great deal!` : 'Competitively priced for quality.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Details Sections */}
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Description & Benefits */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <div className="rounded-2xl bg-white p-6 shadow-card animate-fade-in">
              <h2 className="text-lg font-black">Description</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{product.description}</p>
            </div>

            {/* Benefits */}
            {product.aiSignals && product.aiSignals.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-card animate-fade-in">
                <h2 className="text-lg font-black">Health Highlights</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {product.aiSignals.slice(0, 4).map((signal, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-lg bg-muted/30 p-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      <p className="text-sm font-medium capitalize">{signal.replace(/-/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frequently Bought Together */}
            {related.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-card animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black">Frequently Bought Together</h2>
                  <button className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-smooth">
                    View All <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {related.map((item) => <ProductCard key={item.id} product={item} />)}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Similar Products */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-card animate-fade-in">
              <h2 className="text-lg font-black">Similar Products</h2>
              <div className="mt-4 space-y-3">
                {related.slice(0, 4).map((item) => (
                  <Link 
                    key={item.id} 
                    href={`/product/${item.slug}`}
                    className="flex gap-3 rounded-lg p-2 transition-smooth hover:bg-muted/50"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image 
                        src={item.image} 
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-black">{formatCurrency(item.price)}</span>
                        {item.mrp > item.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(item.mrp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}