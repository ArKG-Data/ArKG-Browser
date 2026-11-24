import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@millenniumdb/graph-explorer/styles.css'
import './index.css'
import Routing from './Routing'

const gtmId = import.meta.env.VITE_GTM_ID;
if (gtmId) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(s);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider>
      <Routing/>
    </MantineProvider>
  </StrictMode>,
)
