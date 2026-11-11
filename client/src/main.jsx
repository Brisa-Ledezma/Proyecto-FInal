import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import './estilos/tokens.css';
import './estilos/base.css';
import './componentes/ui/Campo.css';

import { ProveedorTema } from './contexto/TemaContexto.jsx';
import { ProveedorNotificaciones } from './contexto/NotificacionesContexto.jsx';
import { ProveedorSesion } from './contexto/SesionContexto.jsx';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorTema>
        <ProveedorNotificaciones>
          <ProveedorSesion>
            <App />
          </ProveedorSesion>
        </ProveedorNotificaciones>
      </ProveedorTema>
    </BrowserRouter>
  </React.StrictMode>,
);
