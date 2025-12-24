# Architecture

This document provides a high-level overview of the CampusCircle system architecture, including its service boundaries, data flow, and technology stack.

## System Diagram

```
[Insert high-level system diagram here]
```

## Service Boundaries

The CampusCircle application is composed of the following services:

*   **Frontend:** A single-page application (SPA) built with React and Redux, responsible for the user interface and user experience.
*   **Backend:** A RESTful API built with FastAPI, responsible for business logic, data processing, and communication with the database.
*   **Database:** A PostgreSQL database hosted on Supabase, which serves as the primary data store for the application.
*   **Reverse Proxy:** An Nginx server that acts as a reverse proxy, routing incoming traffic to the appropriate service.

## Data Flow

1.  The user interacts with the React frontend in their browser.
2.  The frontend sends API requests to the Nginx reverse proxy.
3.  Nginx routes the requests to the FastAPI backend.
4.  The backend processes the requests, interacts with the Supabase database, and returns a response.
5.  The frontend receives the response and updates the UI accordingly.

## Authentication

Authentication is handled using Supabase Auth, which provides a JWT-based authentication system. The backend validates the JWTs to ensure that only authenticated users can access protected endpoints.
