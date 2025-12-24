# CampusCircle

Welcome to CampusCircle, a modern, containerized, multi-service application designed to connect schools and parents through a seamless events platform.

## Overview

CampusCircle is a production-ready application built with a focus on modularity, portability, and reproducibility. It features a React frontend, a FastAPI backend, and a Supabase-backed datastore, all running in a containerized environment orchestrated by Docker Compose.

## Quickstart

To get started with CampusCircle, you'll need to have Docker and Docker Compose installed on your local machine.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/campus-circle.git
    cd campus-circle
    ```

2.  **Set up environment variables:**
    Copy the `.env.example` file to `.env` and fill in the required Supabase credentials and other configuration details.

3.  **Run the application:**
    ```bash
    docker-compose up --build
    ```

The application will be available at `http://localhost:3000`.

## Local Development

For local development, you can run the frontend and backend services independently.

### Frontend

```bash
cd frontend
npm install
npm start
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
