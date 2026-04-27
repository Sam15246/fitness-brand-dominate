"use client";

import Image, { type ImageProps } from "next/image";

import { cloudflareR2Loader } from "@/lib/cloudflare-r2";

type AppImageProps = Omit<ImageProps, "loader" | "alt"> & {
  alt: string;
};

export default function AppImage(props: AppImageProps) {
  const { alt, ...rest } = props;
  const srcValue =
    typeof rest.src === "string"
      ? rest.src
      : "src" in rest.src
        ? rest.src.src
        : rest.src.default.src;
  const useCustomLoader = srcValue.startsWith("/static/") || srcValue.startsWith("http://") || srcValue.startsWith("https://");

  return <Image alt={alt} {...rest} {...(useCustomLoader ? { loader: cloudflareR2Loader } : {})} />;
}
