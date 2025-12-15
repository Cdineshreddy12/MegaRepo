import { CheckboxField } from './CheckboxField';
import { DateField } from './DateField';
import { FileField } from './FileField';
import { NumberField } from './NumberField';
import { RadioField } from './RadioField';
import { SelectField } from './SelectField';
import { SwitchField } from './SwitchField';
import { TextareaField } from './TextareaField';
import { TextField } from './TextField';
import { PasswordField } from './PasswordField';
import { EmailField } from './EmailField';
import { UrlField } from './UrlField';
import { TelField } from './TelField';
import { SearchField } from './SearchField';
import { ColorField } from './ColorField';
import { RangeField } from './RangeField';

export { TextField } from './TextField';
export { TextareaField } from './TextareaField';
export { NumberField } from './NumberField';
export { DateField } from './DateField';
export { SelectField } from './SelectField';
export { RadioField } from './RadioField';
export { CheckboxField } from './CheckboxField';
export { SwitchField } from './SwitchField';
export { FileField } from './FileField';
export { PasswordField } from './PasswordField';
export { EmailField } from './EmailField';
export { UrlField } from './UrlField';
export { TelField } from './TelField';
export { SearchField } from './SearchField';
export { ColorField } from './ColorField';
export { RangeField } from './RangeField';

// Field component mapping
export const FIELD_COMPONENTS = {
  text: TextField,
  email: EmailField,
  password: PasswordField,
  textarea: TextareaField,
  number: NumberField,
  date: DateField,
  select: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
  switch: SwitchField,
  file: FileField,
  url: UrlField,
  tel: TelField,
  search: SearchField,
  color: ColorField,
  range: RangeField,
} as const;
