import { forwardRef, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { color, elevation, motion, radius, spacing, typography } from '@/constants/tokens';

type ButtonProps = {
  variant: 'button';
  placeholder: string;
  onPress: () => void;
  trailing?: ReactNode;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

type InputProps = Omit<TextInputProps, 'style'> & {
  variant: 'input';
  trailing?: ReactNode;
  style?: ViewStyle;
};

export type SearchBarProps = ButtonProps | InputProps;

/**
 * Unified search bar across home / search / map.
 * Always: h=48, radius.l, white surface, subtle shadow, brand-tinted leading icon.
 */
export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  props,
  ref,
) {
  if (props.variant === 'button') {
    const { placeholder, onPress, trailing, accessibilityLabel, style } = props;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={({ pressed }) => [
          styles.bar,
          pressed && { opacity: motion.press.opacity, transform: [{ scale: 0.98 }] },
          style,
        ]}>
        <Icon name="search" size={18} color={color.brand.primary} />
        <Text style={styles.placeholder}>{placeholder}</Text>
        {trailing}
      </Pressable>
    );
  }

  const { trailing, style, ...inputProps } = props;
  return (
    <View style={[styles.bar, style]}>
      <Icon name="search" size={18} color={color.brand.primary} />
      <TextInput
        ref={ref}
        placeholderTextColor={color.text.tertiary}
        style={styles.input}
        {...inputProps}
      />
      {trailing}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: spacing.l,
    gap: spacing.s,
    backgroundColor: color.surface.subtle,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: color.border.default,
    ...(elevation.subtle as ViewStyle),
  },
  placeholder: {
    ...typography.body,
    flex: 1,
    color: color.text.tertiary,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: color.text.primary,
    paddingVertical: 0,
  },
});
