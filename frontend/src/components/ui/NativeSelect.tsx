import React, { createElement } from 'react';
import { Platform, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  groups?: { label: string; options: SelectOption[] }[];
  placeholder?: string;
  mini?: boolean;
  style?: any;
}

export function BleicheSelect({
  value,
  onChange,
  options,
  groups,
  placeholder,
  mini = false,
  style,
}: SelectProps) {
  if (Platform.OS === 'web') {
    const baseStyle: any = {
      fontFamily: fonts.sans,
      fontSize: mini ? 11 : 14,
      border: 'none',
      borderBottom: `1px solid ${mini ? colors.dark200 : colors.dark300}`,
      backgroundColor: 'transparent',
      outline: 'none',
      cursor: 'pointer',
      color: colors.textPrimary,
      height: mini ? 22 : 34,
      paddingLeft: mini ? 2 : 4,
      ...style,
    };

    if (groups) {
      return createElement(
        'select',
        { value, onChange: (e: any) => onChange(e.target.value), style: baseStyle },
        placeholder ? createElement('option', { key: '', value: '' }, placeholder) : null,
        ...groups.map((g) =>
          createElement(
            'optgroup',
            { key: g.label, label: g.label },
            ...g.options.map((o) =>
              createElement('option', { key: o.value, value: o.value }, o.label),
            ),
          ),
        ),
      );
    }

    return createElement(
      'select',
      { value, onChange: (e: any) => onChange(e.target.value), style: baseStyle },
      placeholder ? createElement('option', { key: '', value: '' }, placeholder) : null,
      ...options.map((o) =>
        createElement('option', { key: o.value, value: o.value }, o.label),
      ),
    );
  }

  // Native fallback: plain text input (sufficient for now)
  return (
    <TextInput
      style={[mini ? styles.mini : styles.full, style]}
      value={value}
      onChangeText={onChange}
    />
  );
}

const styles = StyleSheet.create({
  full: {
    height: 34,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark300,
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.textPrimary,
    paddingHorizontal: 4,
  },
  mini: {
    height: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
    fontSize: 11,
    fontFamily: fonts.sans,
    color: colors.textPrimary,
    paddingHorizontal: 2,
  },
});
