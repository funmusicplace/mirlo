const styles = `html {
  --mi-normal-background-color: #ffeedb;
  --mi-light-background-color: #ffffee;
  --mi-lighter-background-color: rgba(255, 255, 255, 0.4);
  --mi-shade-background-color: rgba(0, 0, 0, .05);

  --mi-normal-foreground-color: #3e363f;
  --mi-light-foreground-color: #888;
  --mi-lighter-foreground-color: #bbb;

  --mi-primary-color: #e75a7c;
  --mi-primary-color--hover: #f77b99;

  --mi-secondary-color: #ffb3d0;
  --mi-secondary-color--hover: #FF80B0;

  --mi-success-background-color: #4cdb5f;

  --mi-warning-color: #f04e37;
  --mi-warning-color--hover: #f26f59;
  --mi-warning-background-color: var(--mi-warning-color);
  --mi-darken-warning-background-color: #df250b;
  --mi-warning-foreground-color: white;

  --mi-primary-highlight-color: #bcb3ff;
  --mi-primary-highlight-color--hover: #FFB3D0;
);
  --mi-box-color: var(--mi-secondary-color);

  --mi-border-radius: 4px;
  --mi-border-radius-focus: 8px;
  
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

html {
  font-size: 18px;
  min-height: 100%;
}

body {
  background-color: var(--mi-normal-background-color);
  color: var(--mi-normal-foreground-color);
  font-family: 'Lora', serif;
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
