import React from "react";
import { View, Text, Image } from "react-native";
import { useTranslation } from "react-i18next";

import images from "@/constants/images";

const NoResults = () => {
  const { t } = useTranslation();
  return (
    <View className="flex items-center my-5">
      <Image
        source={images.noResult}
        className="w-11/12 h-80"
        resizeMode="contain"
      />
      <Text className="text-2xl font-rubik-bold text-black-300 mt-5">
        {t("noResults.title")}
      </Text>
      <Text className="text-base text-black-100 mt-2 text-center px-4">
        {t("noResults.subtitle")}
      </Text>
    </View>
  );
};

export default NoResults;
