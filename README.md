# Myth AI

A world-mythology research and analysis platform by Sameer Khan — designed for discovering, comparing, and understanding parallel myths across ancient cultures through explainable AI and linguistic analysis.

## 🚀 What is Myth AI
MythAI is a full-stack PERN web app built to explore and compare global mythologies.
It serves as a research platform where users can analyze myths, discover narrative parallels using NLP-based similarity scoring, and browse themes or traditions across cultures.
Insightful, explainable, and data-driven — combining linguistic analysis with human-curated mythology for historians, educators, and enthusiasts.

## 🧰 Tech Stack  
- **Frontend:** React (hosted on Cloudflare Pages)  
- **Styling / UI components:** Custom minimal UI with Bootstrap & modern theming  
- **Routing:** React Router for navigating myths, themes, and parallels  
- **NLP / Similarity Engine:** TF-IDF + cosine similarity via the `natural` library  
- **Deployment:** Cloudflare Pages (frontend) + Render (backend)  
- **Backend / API:** Node.js + Express with PostgreSQL for myth, theme, and parallel data  


## 🛠️ Setup & Run Locally  

```bash
git clone https://github.com/sameer-khan-a/MythAI.git
cd MythAI
npm install
npx nodemon server.js    # or node server.js for production

```

## 🧭 Project Structure  (example / your layout might vary)

```
/backend          → Express server and API routes  
/frontend         → React client app  
  /components     → Myth cards, comparison views, and layout components  
  /pages          → Myth listings, theme browser, and parallel explorer  
  /utils          → similarity helpers, API handlers, and cache logic  
  App.js / index.js  
package.json  
README.md  
```

## ✅ Features  
- Fully responsive UI (mobile → desktop)  
- Myth exploration and detail pages  
- Parallel suggestion and comparison engine using NLP  
- Clean, readable component structure with modern UI design  
- Easily extensible for future features (vector search, user accounts, etc.)  


## 🚧 Roadmap / To-Do  
- Add user authentication & authorization (for researchers or contributors)  
- Expand backend capabilities with Node.js + Express + PostgreSQL  
- Role-based dashboards (for managing myths, themes, and parallel data)  
 

## 🧪 Testing  
Testing is *not yet* configured. Plans: add unit / UI tests once logic grows.  

## 📦 Deployment  
**Live preview / demo:** [https://mythai.pages.dev ](https://mythai-byg.pages.dev/) 
Frontend hosted on Cloudflare Pages.  
Backend hosted on Render: [https://mythai-backend.onrender.com  ](https://mythai-backend.onrender.com)


## 📸 Snapshots / Preview

![Myth AI Screenshot 1](./images/mythAI1.png)  
![Myth AI Screenshot 2](./images/mythAI2.png)  
![Myth AI Screenshot 3](./images/mythAI3.png)  
![Myth AI Screenshot 4](./images/mythAI4.png)
![Myth AI Screenshot 5](./images/mythAI5.png)

## 🙋‍♂️ Contact / Author  
Sameer Khan — MERN-/AI-ML-curious dev & mythology enthusiast  
- GitHub: [sameer-khan-a](https://github.com/sameer-khan-a)  
