import { ROTULO_STATUS } from './format';

export default function StatusBadge({ status }) {
  return <span className={`badge ${status}`}>{ROTULO_STATUS[status] || status}</span>;
}
