import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, TOP_INSET, cardShadow } from "../constants/theme";

export function ScreenHeader({ title, subtitle, onMenuPress, rightAction }) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.menuBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.menuLine} />
          <View style={[styles.menuLine, { width: 12 }]} />
          <View style={styles.menuLine} />
        </TouchableOpacity>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightAction ? <View style={styles.right}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: TOP_INSET + 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginRight: 14,
    ...cardShadow,
  },
  menuLine: {
    width: 16,
    height: 2,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  right: {
    marginLeft: 10,
  },
});
