const styles = `html {
  --mi-normal-background-color: white;
  --mi-normal-foreground-color: #333;

  --mi-primary-color: #be3455;
  --mi-primary-color--hover: #00C4DB;

  --mi-secondary-color: #ffb3d0;
  --mi-secondary-color--hover: #FF80B0;

  --mi-success-background-color: #4cdb5f;

  --mi-warning-background-color: #f04e37;
  --mi-darken-warning-background-color: #df250b;
  --mi-warning-foreground-color: white;

  --mi-primary-highlight-color: #bcb3ff;
  --mi-primary-highlight-color--hover: #FFB3D0;

  --mi-shade-background-color: rgba(0, 0, 0, .1);
  --mi-lighten-background-color: rgba(255, 255, 255, 0.2);
  --mi-box-color: var(--mi-secondary-color);

  --mi-border-radius: 1rem;
  --mi-border-radius-focus: 1.5rem;
  
  --mi-icon-button-background-color: var(--mi-shade-background-color);
  --mi-icon-button-background-color--hover: rgba(0, 0, 0, 0.2);
}

@media (prefers-color-scheme: dark) {
  html {
    --mi-normal-background-color: #333;
    --mi-normal-foreground-color: white;
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

@font-face {
  font-family: 'Patrick Hand SC';
  font-style: normal;
  font-weight: 400;
  src: local('Patrick Hand SC'),
    local('PatrickHandSC-Regular'),
    url(https://fonts.gstatic.com/s/patrickhandsc/v4/OYFWCgfCR-7uHIovjUZXsZ71Uis0Qeb9Gqo8IZV7ckE.woff2)
      format('woff2');
  unicode-range: U+0100-024f, U+1-1eff,
    U+20a0-20ab, U+20ad-20cf, U+2c60-2c7f,
    U+A720-A7FF;
}

html {
  font-size: 18px;
  min-height: 100%;
}

body {
  background-color: var(--mi-normal-background-color);
  color: var(--mi-normal-foreground-color);
}

body,
#root {
  min-height: 100%;
}

h1 {
  font-size: 2.5rem;
  line-height: 2;

  a {
    text-decoration: none;
    color: black;
  }
}

h2 {
  font-size: 1.9rem;
  line-height: 1.5;
  margin-bottom: 0.4rem;
}

h3 {
  font-size: 1.7rem;
  padding-bottom: 1rem;
}

h4 { 
  font-size: 1.4rem;
  padding-bottom: .75rem;
}

h5 {
  font-size: 1.2rem;
  padding-bottom: .75rem;
}

a {
  transition: .25s color, .25s background-color;
  color: var(--mi-primary-color);
}

h6 {
  font-size: 1.1rem;
  padding-bottom: .75rem;
}

@media (max-width: 800px) {
  h1 {
    font-size: 2rem;
  }

  h2 {
    font-size: 1.8rem;
  }
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-3rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(3rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spinning {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`;

export default styles;
