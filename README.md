# Freezerino

Lista do freezer da família: o que tem em cada prateleira e gaveta, com quantidades.
Web app em português, feito para usar no celular (adicionar à tela inicial).

- **Página:** HTML/CSS/JS estático, hospedado no GitHub Pages.
- **Dados:** Firebase Firestore (São Paulo), sincronizado ao vivo entre os celulares e com cache offline.
- **Login:** uma conta compartilhada da família (`familia@freezerino.app`) no Firebase Auth; o app pede só a senha.
  As regras em `firestore.rules` liberam leitura e escrita apenas para essa conta.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html`, `style.css`, `app.js` | O app (abas Freezer, Compras, Prateleiras) |
| `store.js` | Acesso ao Firebase; em `localhost/?demo` usa dados falsos na memória para testar |
| `seed.js` | A lista de papel, carregada uma vez no primeiro login |
| `firestore.rules` | Regras de acesso do Firestore (colar em Firestore → Regras) |
| `manifest.json`, `icons/` | Ícone e nome na tela inicial |

## Rodar localmente

```bash
python -m http.server 5173 --directory .
```

Depois abra http://localhost:5173.

## Trocar a senha da família

Firebase Console → Authentication → Users → `familia@freezerino.app` → Redefinir senha.
Depois, cada pessoa toca em "Sair" e entra com a senha nova.

© NKO Industries
