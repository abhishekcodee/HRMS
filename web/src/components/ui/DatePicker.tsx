import React from 'react';
import { Calendar } from 'lucide-react';
import { Input, InputProps } from './Input';

export interface DatePickerProps extends Omit<InputProps, 'type'> {}

export const DatePicker: React.FC<DatePickerProps> = props => {
  return <Input type="date" icon={<Calendar size={16} />} {...props} />;
};
