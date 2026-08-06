const PRODUCT_PRICE_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export function formatProductPrice(price: number): string {
  return PRODUCT_PRICE_FORMATTER.format(price);
}
