import { Tabs } from "expo-router";
import { Image, ImageSourcePropType, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import icons from "@/constants/icons";

const TabIcon = ({
    focused,
    icon,
    title,
}: {
    focused: boolean;
    icon: ImageSourcePropType;
    title: string;
}) => (
    <View className="flex-1 mt-3 flex flex-col items-center">
        <Image
            source={icon}
            tintColor={focused ? "#0061FF" : "#666876"}
            resizeMode="contain"
            className="size-6"
        />
        <Text
            className={`${
                focused
                    ? "text-primary-300 font-rubik-medium"
                    : "text-black-200 font-rubik"
            } text-xs w-full text-center mt-1`}
        >
            {title}
        </Text>
    </View>
);

const TabsLayout = () => {
    const { t } = useTranslation();

    return (
        <Tabs
            screenOptions={{
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: "white",
                    position: "absolute",
                    borderTopColor: "#0061FF1A",
                    borderTopWidth: 1,
                    minHeight: 70,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t("tabs.home"),
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.home}
                            title={t("tabs.home")}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: t("tabs.explore"),
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.search}
                            title={t("tabs.explore")}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: t("tabs.map"),
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.location}
                            title={t("tabs.map")}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="saved"
                options={{
                    title: t("tabs.saved"),
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.heart}
                            title={t("tabs.saved")}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t("tabs.profile"),
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.person}
                            title={t("tabs.profile")}
                        />
                    ),
                }}
            />
        </Tabs>
    );
};

export default TabsLayout;
