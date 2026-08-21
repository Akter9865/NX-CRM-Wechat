# NX CRM — Enterprise WhatsApp & WeChat AI CRM Suite

<p align="center">
  <strong>The Next-Gen Multi-Tenant Omni-Channel CRM with Gemini AI & Visual Automations</strong><br>
  <em>Developed, Maintained, and Powered by <strong>Nexora Spark Agency</strong></em>
</p>

---

## 🌟 Executive Overview

**NX CRM** is a high-performance, enterprise-grade multi-tenant CRM built on **Next.js 16 (Turbopack)** and **Supabase (PostgreSQL + RLS)**. Engineered specifically for agencies, sales teams, and customer support organizations, it unifies **WhatsApp Cloud API**, **WeChat Integration**, **Google Gemini AI 2.5/2.0**, **Drag-and-Drop Visual Flow Automations**, and **Master Super Admin Multi-Client Billing**.

---

## 🚀 Core Platform Features

### 💬 1. Unified Shared Team Inbox
- **Multi-Agent Collaboration**: Multiple team agents on one or more WhatsApp Business numbers.
- **Full Multimedia Support**: Real-time two-way text chat, in-browser Voice Note recording (Ogg/Opus), photo lightbox zoom, in-line video streaming, PDF/Office document attachments, and emoji reactions.
- **Interactive Messaging**: WhatsApp Quick Reply Buttons, interactive list pickers, and official Meta Template messages.
- **Quote / Reply-To**: Native quote-reply threading for customer context.

### 🤖 2. Multi-Provider AI Engine (Google Gemini, OpenAI, Claude)
- **Google Gemini 2.5 & 2.0 Flash**: Ultra-fast auto-replies, smart draft generation, and conversation summarization.
- **RAG Knowledge Base**: Upload business FAQs, product catalogues, and policies with hybrid semantic search.
- **Automated Human Handoff**: Smooth transitions from AI agent to human support when complex queries arise.

### ⚡ 3. Drag-and-Drop Visual Flow Builder (`/flows` & `/automations`)
- **No-Code Automation Engine**: Node-based canvas with triggers (keyword matches, incoming messages, schedule/delay).
- **Branching Logic**: Conditional if/else paths, auto-tagging, deal pipeline creation, and external webhook dispatches.
- **Live Simulator**: Test and debug workflow execution in real-time.

### 👑 4. Master Super Admin Panel (`/superadmin`)
- **Tenant Management**: Global directory of all client companies and organizations.
- **Usage & Revenue Metrics**: Monthly Recurring Revenue (MRR), active connections, and message volume tracking.
- **Manual Subscription Overrides**: Instant plan upgrades (Pro, Business, Enterprise) and custom limit overrides.

### 📊 5. Sales Pipelines & Broadcasts
- **Kanban Pipeline Board**: Drag-and-drop deal stages linked directly to conversations.
- **Meta-Compliant Broadcasts**: High-throughput campaign engine with template parameter personalization.

---

## 🛠️ Quick Start & Local Development

### 1. Prerequisites
- Node.js `>= 20.0.0`
- Supabase Project (PostgreSQL with pgvector)
- Meta WhatsApp Cloud API credentials

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/nx-crm.git

# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local

# Run the Turbopack development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚖️ Proprietary License & Copyright

```
COMMERCIAL SOFTWARE LICENSE & COPYRIGHT NOTICE
Copyright (c) 2026 Nexora Spark Agency. All rights reserved.

Product: NX CRM Enterprise Suite
Author & Maintainer: Nexora Spark Agency
Website: https://nexorasparkagency.com
Contact: contact@nexorasparkagency.com
```

This software and its source code are the exclusive intellectual property of **Nexora Spark Agency**. Unauthorized reproduction, redistribution, or white-label resale without a valid commercial license agreement is strictly prohibited.
