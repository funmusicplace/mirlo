import IconButton from './IconButton';
import { FaTrash } from 'react-icons/fa';

const SomeComponent = () => (
  <IconButton
    icon={<FaTrash />}
    onClick={handleDelete}
    ariaLabel="Delete item"
  />
);