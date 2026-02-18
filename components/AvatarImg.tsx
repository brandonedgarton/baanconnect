import React, { useEffect, useState } from "react";
import { Image, ImageSourcePropType } from "react-native";

// components is a sibling of assets/, so one ../ is correct:
const FALLBACK = require("../assets/images/avatar-male-default.png");

type Props = {
  uri?: string | null;
  size: number; // e.g., 48, 176
};

export default function AvatarImg({ uri, size }: Props) {
  const [src, setSrc] = useState<ImageSourcePropType>(FALLBACK);

  useEffect(() => {
    // only trust https remote URLs; otherwise stay on fallback
    if (uri && typeof uri === "string" && uri.startsWith("https://")) {
      setSrc({ uri });
    } else {
      setSrc(FALLBACK);
    }
  }, [uri]);

  return (
    <Image
      source={src}
      defaultSource={FALLBACK} // iOS placeholder while loading
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
      onError={() => setSrc(FALLBACK)} // if remote fails, keep fallback (no disappearing)
    />
  );
}
