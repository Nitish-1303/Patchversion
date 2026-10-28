import Link from 'next/link';

export default function NotFound() {
  return <section className="section-block content-width not-found"><span className="eyebrow-chip">404 · PAGE NOT FOUND</span><h1>This path is not in the prototype.</h1><p>Try the product overview or browse the documentation.</p><div><Link className="pill-button pill-button-dark" href="/product">Product</Link><Link className="pill-button pill-button-outline" href="/docs">Docs</Link></div></section>;
}
