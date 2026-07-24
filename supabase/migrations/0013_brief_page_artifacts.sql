-- Migration 0013 — Paste-ready page artifacts on content briefs
--
-- Each brief now also carries a ready-to-publish HTML page and a schema.org FAQPage JSON-LD block,
-- generated deterministically from the same structured LLM output as the markdown brief (see
-- src/lib/content/brief-render.ts). This is the "easy mode": the user pastes these into their CMS
-- instead of writing a page from scratch. Nullable — older briefs (and any that fail to render)
-- simply have no artifacts.

alter table public.content_briefs
  add column if not exists page_html text,
  add column if not exists faq_schema text;
