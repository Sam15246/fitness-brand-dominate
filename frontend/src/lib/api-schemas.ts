import { z } from "zod";

const productImageSchema = z.object({
  id: z.number(),
  path: z.string(),
  url: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  is_primary: z.boolean(),
  display_order: z.number(),
});

const productVariantSchema = z.object({
  id: z.number(),
  sku: z.string(),
  option_values: z.record(z.string()),
  price_override: z.number().nullable(),
  effective_price: z.number(),
  stock_quantity: z.number(),
  weight_grams: z.number().nullable(),
  is_active: z.boolean(),
});

const productReviewSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: z.string().nullable(),
  rating: z.number(),
  title: z.string().nullable(),
  comment: z.string(),
  is_verified_purchase: z.boolean(),
  created_at: z.string().nullable(),
});

export const productCardSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  price: z.number(),
  price_display: z.string(),
  price_original: z.number().nullable(),
  price_discounted: z.number().nullable(),
  is_discount_active: z.boolean(),
  discount_percentage: z.number(),
  in_stock: z.boolean(),
  is_coming_soon: z.boolean(),
  stock_quantity: z.number(),
  average_rating: z.number(),
  review_count: z.number(),
  primary_image: productImageSchema.nullable(),
});

export const productDetailSchema = productCardSchema.extend({
  images: z.array(productImageSchema),
  variants: z.array(productVariantSchema),
  reviews: z.array(productReviewSchema),
});

export const productsListResponseSchema = z.object({
  items: z.array(productCardSchema),
});

export const productDetailResponseSchema = z.object({
  product: productDetailSchema,
});
