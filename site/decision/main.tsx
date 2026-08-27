import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import DecisionApp from './app';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Private decision application root was not found');

createRoot(root).render(
  <StrictMode>
    <DecisionApp state={__DECISION_STATE__} manifest={__PRIVATE_MANIFEST__} />
  </StrictMode>,
);
