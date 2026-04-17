import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import type { Employee } from '../../types/employee';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface Props {
  employeeId: number;
}

export default function EmployeeProfileScreen({ employeeId }: Props) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getEmployee(employeeId).then(setEmployee).catch((e: Error) => setError(e.message));
  }, [employeeId]);

  if (error) {
    return <Text style={s.error}>{error}</Text>;
  }

  if (!employee) {
    return <ActivityIndicator color={colors.brand600} />;
  }

  return (
    <View style={s.card}>
      <Text style={s.title}>{employee.first_name} {employee.last_name}</Text>
      <Text style={s.row}>Role: {employee.role}</Text>
      <Text style={s.row}>Email: {employee.email || '-'}</Text>
      <Text style={s.row}>Phone: {employee.phone || '-'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 20,
    gap: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.brand700,
    marginBottom: 6,
  },
  row: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: fonts.sans,
    color: colors.error,
  },
});
