import Image, { type ImageProps } from "next/image";

import { cloudflareR2Loader } from "@/lib/cloudflare-r2";

type AppImageProps = Omit<ImageProps, "loader" | "alt"> & {
  alt: string;
};

export default function AppImage(props: AppImageProps) {
  const { alt, ...rest } = props;
  return <Image alt={alt} {...rest} loader={cloudflareR2Loader} />;
}
