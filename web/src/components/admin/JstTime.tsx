import { formatJst } from '../../utils/datetime';

export function JstTime({ value }: { value: string | number | Date }) {
  return <>{formatJst(value)}</>;
}
