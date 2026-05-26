import { ImageOff } from 'lucide-react'

export default function ProductImage({ src, alt }) {
  if (!src) {
    return (
      <div className="product-image product-image--empty">
        <ImageOff size={18} />
      </div>
    )
  }

  return <img className="product-image" src={src} alt={alt || 'Product'} loading="lazy" />
}
