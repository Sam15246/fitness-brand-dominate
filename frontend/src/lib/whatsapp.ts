type WhatsAppOrderItem = {
  name: string;
  quantity: number;
  unit_price: number;
  variant_label?: string;
};

type WhatsAppCustomerData = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

type WhatsAppPayload = {
  customer: WhatsAppCustomerData;
  items: WhatsAppOrderItem[];
  total: number;
  discount?: number;
  coupon_code?: string;
};

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "917068462273";

export function buildWhatsAppUrl(payload: WhatsAppPayload): string {
  const lines: string[] = [
    "Dominate -train anywhere Dominate everywhere",
    "",
    "My DETAILS:",
    `Name: ${payload.customer.name}`,
    `Phone: ${payload.customer.phone}`,
    `Email: ${payload.customer.email}`,
    "",
    "DELIVERY ADDRESS:",
    payload.customer.address,
    `${payload.customer.city}, ${payload.customer.state} ${payload.customer.pincode}`,
    "",
    "Need to order the following ITEMS:",
  ];

  payload.items.forEach((item, idx) => {
    const priceDisplay = `\u20B9${(item.unit_price / 100).toFixed(2)}`;
    const label = item.variant_label ? ` (${item.variant_label})` : "";
    lines.push(`${idx + 1}. ${item.name}${label}`);
    lines.push(`   Qty: ${item.quantity} | Price: ${priceDisplay}`);
    lines.push("");
  });

  if (payload.coupon_code && payload.discount && payload.discount > 0) {
    lines.push(`COUPON: ${payload.coupon_code}`);
    lines.push(`DISCOUNT: -\u20B9${(payload.discount / 100).toFixed(2)}`);
    lines.push("");
  }

  const payable = payload.total - (payload.discount || 0);
  lines.push("TOTAL AMOUNT:");
  lines.push(`\u20B9${(payable / 100).toFixed(2)}`);

  const message = lines.join("\n");
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}
