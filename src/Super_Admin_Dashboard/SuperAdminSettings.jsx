import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../Login_SignUp/AuthContext';

/* ============================================================================
   LIBRASCAN — Super Admin Settings
   Same layout/behavior as the Librarian/Admin Settings page (Profile + Security
   tabs, avatar upload, edit-profile form, change password, 2FA placeholder),
   restyled with self-contained tokens so it doesn't depend on Dashboard.css.
============================================================================ */

const MAROON        = '#7B0000';
const MAROON_DEEP    = '#5A0000';
const MAROON_MID     = '#8B0000';
const GOLD           = '#C9A84C';
const TEXT_PRIMARY   = '#3A0000';
const TEXT_SECONDARY = '#5A1010';
const TEXT_MUTED     = '#7A3030';
const TEXT_DIM       = 'rgba(90,16,16,0.55)';
const FONT_SANS      = "'DM Sans', 'Josefin Sans', sans-serif";
const FONT_DISPLAY   = "'Cinzel', 'Cormorant Garamond', serif";

const CSS = `
  .sas-wrap { max-width: 100%; }

  .sas-tabs {
    display: flex;
    border-bottom: 1px solid rgba(139,0,0,0.18);
    margin-bottom: 28px;
    gap: 0;
  }
  .sas-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 22px;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    font-family: ${FONT_SANS};
    font-size: 13px;
    font-weight: 500;
    color: ${TEXT_MUTED};
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .sas-tab:hover { color: ${TEXT_SECONDARY}; }
  .sas-tab.on {
    font-weight: 700;
    color: ${MAROON};
    border-bottom-color: ${MAROON};
  }

  .sas-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 840px) { .sas-grid { grid-template-columns: 1fr; } }

  .sas-card {
    background: linear-gradient(160deg, #FDF6EC 0%, #FAF0E4 100%);
    border: 1px solid rgba(139,0,0,0.14);
    border-radius: 14px;
    padding: 24px 26px;
    box-shadow: 0 2px 8px rgba(80,0,0,0.07), 0 6px 24px rgba(80,0,0,0.05);
  }
  .sas-card-h {
    font-family: ${FONT_SANS};
    font-size: 15px;
    font-weight: 700;
    color: ${TEXT_PRIMARY};
    margin: 0 0 3px 0;
    text-align: center;
  }
  .sas-card-sub {
    font-size: 12px;
    color: ${TEXT_MUTED};
    line-height: 1.5;
    margin: 0 0 20px 0;
    text-align: center;
  }
  .sas-line { height: 1px; background: rgba(139,0,0,0.10); margin: 18px 0; }
  .sas-micro {
    font-family: ${FONT_SANS};
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: rgba(139,0,0,0.45);
    margin-bottom: 12px;
    text-align: center;
  }

  .sas-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border-radius: 8px;
    margin-bottom: 4px;
    background: rgba(139,0,0,0.035);
    border: 1px solid rgba(139,0,0,0.07);
    gap: 12px;
  }
  .sas-row:last-child { margin-bottom: 0; }
  .sas-row-k { font-size: 11.5px; color: ${TEXT_MUTED}; flex-shrink: 0; font-weight: 500; }
  .sas-row-v { font-size: 12.5px; font-weight: 600; color: ${TEXT_PRIMARY}; text-align: right; word-break: break-all; }

  .sas-field { margin-bottom: 14px; }
  .sas-label {
    display: block;
    font-family: ${FONT_SANS};
    font-size: 12px;
    font-weight: 600;
    color: ${TEXT_SECONDARY};
    margin-bottom: 5px;
  }
  .sas-req { color: #C0392B; margin-left: 2px; }
  .sas-opt { font-weight: 400; color: ${TEXT_DIM}; font-size: 11px; margin-left: 4px; }
  .sas-input {
    width: 100%;
    padding: 9px 13px;
    border: 1.5px solid rgba(139,0,0,0.16);
    border-radius: 8px;
    background: rgba(255,248,240,0.80);
    color: ${TEXT_PRIMARY};
    font-family: ${FONT_SANS};
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sas-input:focus {
    border-color: rgba(123,0,0,0.50);
    box-shadow: 0 0 0 3px rgba(123,0,0,0.07);
    background: #fff8f2;
  }
  .sas-input::placeholder { color: rgba(90,16,16,0.30); }
  .sas-input.e { border-color: #C0392B !important; }
  .sas-input:disabled { background: rgba(139,0,0,0.05); color: ${TEXT_MUTED}; cursor: not-allowed; border-color: rgba(139,0,0,0.10); }
  .sas-err  { display: block; margin-top: 4px; font-size: 11px; color: #C0392B; }
  .sas-hint { display: block; margin-top: 4px; font-size: 11px; color: ${TEXT_DIM}; font-style: italic; }

  .sas-pw-wrap { position: relative; }
  .sas-pw-wrap .sas-input { padding-right: 40px; }
  .sas-eye {
    position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
    background: none; border: none; padding: 0;
    cursor: pointer; color: ${TEXT_MUTED};
    display: flex; align-items: center;
    opacity: 0.65; transition: opacity 0.14s, color 0.14s;
  }
  .sas-eye:hover { opacity: 1; color: ${MAROON}; }

  .sas-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 520px) { .sas-2 { grid-template-columns: 1fr; } }

  .sas-tip {
    background: rgba(201,168,76,0.08);
    border: 1px solid rgba(201,168,76,0.26);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    color: ${TEXT_SECONDARY};
    line-height: 1.65;
    margin-bottom: 16px;
  }

  .sas-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; padding: 9px 20px; border-radius: 8px; border: none;
    font-family: ${FONT_SANS}; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.16s; white-space: nowrap;
  }
  .sas-btn.p {
    background: linear-gradient(135deg, #7B0000 0%, #5A0000 100%);
    color: #F5E4A8;
    box-shadow: 0 2px 8px rgba(80,0,0,0.20);
  }
  .sas-btn.p:hover:not(:disabled) {
    background: linear-gradient(135deg, #8B0000 0%, #6B0000 100%);
    box-shadow: 0 4px 14px rgba(80,0,0,0.28);
    transform: translateY(-1px);
  }
  .sas-btn.p:disabled { opacity: 0.42; cursor: not-allowed; transform: none; }
  .sas-btn.o {
    background: transparent;
    border: 1.5px solid rgba(139,0,0,0.22);
    color: ${TEXT_SECONDARY};
  }
  .sas-btn.o:hover:not(:disabled) { border-color: rgba(139,0,0,0.48); color: ${MAROON}; background: rgba(139,0,0,0.04); }
  .sas-btn.o:disabled { opacity: 0.38; cursor: not-allowed; }
  .sas-btn.d {
    background: transparent;
    border: 1.5px solid rgba(192,57,43,0.28);
    color: #C0392B;
  }
  .sas-btn.d:hover:not(:disabled) { background: rgba(192,57,43,0.06); border-color: rgba(192,57,43,0.52); }
  .sas-btn.d:disabled { opacity: 0.38; cursor: not-allowed; }
  .sas-btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }

  .s-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(245,228,168,0.35);
    border-top-color: #F5E4A8;
    animation: sas-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes sas-spin { to { transform: rotate(360deg); } }

  .sas-av-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0 22px;
    border-bottom: 1px solid rgba(139,0,0,0.10);
    margin-bottom: 20px;
  }
  .sas-av-ring {
    width: 90px; height: 90px; border-radius: 50%;
    border: 3px solid rgba(201,168,76,0.55);
    overflow: hidden; position: relative; flex-shrink: 0;
    background: rgba(123,0,0,0.08);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 5px rgba(201,168,76,0.12), 0 4px 18px rgba(80,0,0,0.14);
  }
  .sas-av-ring img { width: 100%; height: 100%; object-fit: cover; }
  .sas-av-init {
    font-family: ${FONT_DISPLAY};
    font-size: 30px; font-weight: 700; color: ${MAROON};
  }
  .sas-av-cam {
    position: absolute; bottom: 2px; right: 2px;
    width: 24px; height: 24px; border-radius: 50%;
    background: ${MAROON}; border: 2px solid #FDF6EC;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #F5E4A8; transition: background 0.14s;
  }
  .sas-av-cam:hover:not(:disabled) { background: #8B0000; }
  .sas-av-cam:disabled { opacity: 0.5; cursor: not-allowed; }
  .sas-av-name { font-size: 16px; font-weight: 700; color: ${TEXT_PRIMARY}; margin-bottom: 3px; margin-top: 12px; text-align: center; }
  .sas-av-role { font-size: 12px; color: ${TEXT_MUTED}; text-align: center; margin-bottom: 14px; }

  /* ---------- Profile banner (matches the Librarian/Admin Settings
     page's profile header — maroon cover, floating avatar, large
     transparent-gold name, role/email subinfo) ---------- */
  .sas-prof-banner {
    position: relative;
    background: linear-gradient(160deg, #FDF6EC 0%, #FAF0E4 100%);
    border: 1px solid rgba(139,0,0,0.14);
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 21px;
    box-shadow: 0 2px 8px rgba(80,0,0,0.07), 0 6px 24px rgba(80,0,0,0.05);
  }
  .sas-prof-cover {
    position: relative;
    height: 100px;
    min-height: 100px;
    padding: 0 20px;
    background: linear-gradient(135deg, ${MAROON_MID} 0%, ${MAROON_DEEP} 100%);
    display: flex;
    align-items: flex-end;
    padding-bottom: 10px;
    box-sizing: border-box;
  }
  .sas-prof-cover::after {
    content: '';
    position: absolute; left: 0; right: 0; bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201,168,76,0.55), transparent);
  }
  .sas-prof-remove-btn {
    position: absolute;
    top: 12px; right: 16px;
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px;
    border: none; border-radius: 8px;
    background: rgba(255,255,255,0.18);
    color: #F5E4A8;
    font-family: ${FONT_SANS};
    font-size: 11px; font-weight: 600;
    cursor: pointer;
    z-index: 20;
    transition: background 0.16s;
  }
  .sas-prof-remove-btn:disabled { cursor: default; opacity: 0.75; }
  .sas-prof-remove-btn:hover:not(:disabled) { background: rgba(255,255,255,0.28); }
  .sas-prof-av-float {
    position: absolute;
    left: 30px;
    top: 49px;
    z-index: 10;
  }
  .sas-prof-avwrap {
    width: 100px; height: 100px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 4px solid rgba(201,168,76,0.78);
    background: linear-gradient(135deg, ${MAROON_MID}, ${MAROON_DEEP});
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    box-shadow: 0 5px 16px rgba(0,0,0,0.40);
  }
  .sas-prof-avwrap img { width: 100%; height: 100%; object-fit: cover; }
  .sas-prof-avinit { font-family: ${FONT_DISPLAY}; font-size: 28px; font-weight: 700; color: #F5E4A8; }
  .sas-prof-cam-btn {
    position: absolute;
    bottom: -2px; right: -2px;
    width: 30px; height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${MAROON_MID}, ${MAROON_DEEP});
    border: 3px solid #FDF6EC;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #F5E4A8;
    box-shadow: 0 2px 7px rgba(0,0,0,0.30);
    transition: transform 0.16s;
  }
  .sas-prof-cam-btn:hover:not(:disabled) { transform: scale(1.10); }
  .sas-prof-namewrap { min-width: 0; margin-left: 135px; padding: 0; position: relative; z-index: 3; }
  .sas-prof-name {
    font-family: ${FONT_DISPLAY};
    font-size: 36px;
    font-weight: 700;
    color: #F5E4A8 !important;
    -webkit-text-fill-color: #F5E4A8 !important;
    letter-spacing: 0.025em;
    line-height: 1;
    margin: 0; padding: 0;
    text-shadow: 0 1px 2px rgba(0,0,0,0.35);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100vw - 260px);
    display: block;
    position: relative;
    z-index: 3;
  }
  .sas-prof-subinfo {
    padding: 6px 20px 12px 155px;
    display: flex; flex-direction: column; gap: 4px;
    text-align: left; align-items: flex-start;
    box-sizing: border-box;
  }
  .sas-prof-role { font-family: ${FONT_SANS}; font-size: 14px; font-weight: 500; color: ${TEXT_MUTED}; text-align: left; line-height: 18px; margin: 0; }
  .sas-prof-emailrow { display: flex; align-items: center; gap: 6px; font-family: ${FONT_SANS}; font-size: 13px; color: ${TEXT_DIM}; text-align: left; line-height: 18px; margin: 0; }

  @media (max-width: 768px) {
    .sas-prof-cover { height: 90px; min-height: 90px; }
    .sas-prof-av-float { left: 20px; top: 44px; }
    .sas-prof-avwrap { width: 76px; height: 76px; }
    .sas-prof-namewrap { margin-left: 105px; }
    .sas-prof-name { font-size: 30px; letter-spacing: 0.02em; }
    .sas-prof-subinfo { padding-left: 105px; }
    .sas-prof-role { font-size: 12px; }
    .sas-prof-emailrow { font-size: 11px; }
  }
  @media (max-width: 520px) {
    .sas-prof-namewrap { margin-left: 64px; }
    .sas-prof-subinfo  { padding-left: 22px; padding-top: 38px; }
    .sas-prof-avwrap   { width: 52px; height: 52px; }
  }

  .sas-prof-panel {
    background: linear-gradient(160deg, #FDF6EC 0%, #FAF0E4 100%);
    border: 1px solid rgba(139,0,0,0.14);
    border-radius: 14px;
    padding: 20px 24px;
    box-shadow: 0 2px 8px rgba(80,0,0,0.07), 0 6px 24px rgba(80,0,0,0.05);
  }
  .sas-prof-panel-hdr {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 16px; padding-bottom: 12px;
    border-bottom: 1px solid rgba(139,0,0,0.14);
  }
  .sas-prof-panel-title { font-family: ${FONT_DISPLAY}; font-size: 12px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: ${MAROON}; }
  .sas-prof-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px 24px; }
  @media (max-width: 900px) { .sas-prof-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 520px) { .sas-prof-grid { grid-template-columns: 1fr; } }
  .sas-prof-field { display: flex; flex-direction: column; min-width: 0; }
  .sas-prof-flabel { font-family: ${FONT_SANS}; font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${TEXT_DIM}; margin-bottom: 6px; }
  .sas-prof-fvalue {
    font-family: ${FONT_SANS}; font-size: 13px; color: ${TEXT_SECONDARY};
    padding: 9px 0; border-bottom: 1px solid rgba(139,0,0,0.12);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sas-prof-fvalue.empty { color: ${TEXT_DIM}; font-style: italic; }
  .sas-prof-finput {
    width: 100%; padding: 8px 11px; border-radius: 8px;
    border: 1.5px solid rgba(139,0,0,0.20); background: rgba(255,248,240,0.85);
    color: ${TEXT_PRIMARY}; font-family: ${FONT_SANS}; font-size: 12.5px;
    outline: none; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
  }
  .sas-prof-finput:focus { border-color: rgba(123,0,0,0.5); box-shadow: 0 0 0 3px rgba(123,0,0,0.08); background: #fff8f2; }
  .sas-prof-finput:disabled { background: rgba(139,0,0,0.05); color: ${TEXT_MUTED}; cursor: not-allowed; }

  .sas-badge {
    display: inline-block;
    padding: 2px 10px; border-radius: 20px;
    font-family: ${FONT_SANS}; font-size: 11px; font-weight: 700;
  }

  .sas-mfa-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 13px 16px;
    background: rgba(139,0,0,0.04);
    border: 1px solid rgba(139,0,0,0.10);
    border-radius: 10px;
    margin-bottom: 18px;
  }
  .sas-mfa-label { font-size: 13px; font-weight: 700; color: ${TEXT_PRIMARY}; margin-bottom: 2px; }
  .sas-mfa-desc  { font-size: 11.5px; color: ${TEXT_MUTED}; line-height: 1.45; }
  .sas-mfa-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  .sas-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px;
    font-family: ${FONT_SANS}; font-size: 11px; font-weight: 700;
  }
  .sas-pill.on  { background: rgba(46,125,50,0.10); color: #2E7D32; border: 1px solid rgba(46,125,50,0.22); }
  .sas-pill.off { background: rgba(139,0,0,0.08); color: #8B0000; border: 1px solid rgba(139,0,0,0.20); }
  .sas-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  .sas-toggle { position: relative; width: 44px; height: 24px; cursor: pointer; display: inline-block; }
  .sas-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
  .sas-track {
    position: absolute; inset: 0;
    border-radius: 12px;
    background: rgba(139,0,0,0.16);
    border: 1px solid rgba(139,0,0,0.20);
    transition: background 0.22s, border-color 0.22s;
  }
  .sas-toggle input:checked  ~ .sas-track { background: #2E7D32; border-color: #2E7D32; }
  .sas-toggle input:disabled ~ .sas-track { opacity: 0.35; cursor: not-allowed; }
  .sas-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.22);
    transition: transform 0.22s;
    pointer-events: none;
  }
  .sas-toggle input:checked ~ .sas-track .sas-thumb { transform: translateX(20px); }

  .sas-alert {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 11px 14px; border-radius: 8px;
    font-size: 12.5px; line-height: 1.6;
    margin-bottom: 16px;
  }
  .sas-alert svg { flex-shrink: 0; margin-top: 1px; }
  .sas-alert.info    { background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.24); color: ${TEXT_SECONDARY}; }
  .sas-alert.success { background: rgba(46,125,50,0.07);  border: 1px solid rgba(46,125,50,0.20);  color: #1B5E20; }

  .sas-toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px; border-radius: 9px;
    font-family: ${FONT_SANS}; font-size: 13px; font-weight: 500;
    background: #1C1C1C; color: #F0F0F0;
    box-shadow: 0 6px 24px rgba(0,0,0,0.26);
    max-width: 340px;
    animation: sas-in 0.20s ease;
  }
  .sas-toast.ok  { border-left: 4px solid #2E7D32; }
  .sas-toast.err { border-left: 4px solid #C0392B; }
  @keyframes sas-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ---------- Floating logout button ---------- */
  .sas-fab {
    position: fixed; bottom: 30px; right: 30px; z-index: 400;
    display: flex; align-items: center; justify-content: flex-start;
    height: 54px; width: 54px;
    padding: 0;
    border-radius: 27px;
    border: 1.6px solid rgba(255,255,255,0.28);
    cursor: pointer;
    background: linear-gradient(135deg, #E5533E 0%, ${MAROON_MID} 55%, ${MAROON_DEEP} 100%);
    color: #fff;
    box-shadow: 0 6px 20px rgba(139,0,0,0.38), 0 2px 8px rgba(0,0,0,0.20),
                0 0 0 6px rgba(139,0,0,0.07);
    overflow: hidden;
    transition: width 0.36s cubic-bezier(.34,1.45,.44,1),
                background 0.28s ease, border-color 0.28s ease,
                color 0.28s ease, box-shadow 0.28s ease,
                padding 0.32s ease, transform 0.2s ease;
  }
  /* Hover (and keyboard focus) drives the expand/transform now — click is reserved for confirming logout */
  .sas-fab:hover,
  .sas-fab:focus-visible {
    width: 168px;
    padding: 0 22px 0 16px;
    gap: 12px;
    transform: translateY(-2px);
    background: linear-gradient(135deg, #F0664F 0%, #A30000 55%, ${MAROON_DEEP} 100%);
    border-color: rgba(255,255,255,0.42);
    box-shadow: 0 10px 28px rgba(139,0,0,0.48), 0 3px 10px rgba(0,0,0,0.24),
                0 0 0 7px rgba(139,0,0,0.10);
  }
  .sas-fab:active {
    transform: translateY(-2px) scale(0.97);
  }
  .sas-fab-icon {
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    width: 54px; height: 54px;
    margin-left: -1.6px;
    border-radius: 50%;
    background: rgba(0,0,0,0.16);
    box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.30);
    color: #FFFFFF;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
    transition: width 0.36s cubic-bezier(.34,1.45,.44,1),
                margin 0.36s cubic-bezier(.34,1.45,.44,1),
                background 0.28s ease, transform 0.28s ease;
  }
  .sas-fab:hover .sas-fab-icon,
  .sas-fab:focus-visible .sas-fab-icon {
    width: 22px; height: 22px;
    margin-left: 0;
    background: transparent;
    box-shadow: none;
    transform: scale(1.04);
  }
  .sas-fab-icon svg { display: block; }
  .sas-fab-label {
    font-family: ${FONT_SANS};
    font-size: 13.5px; font-weight: 700; letter-spacing: 0.02em;
    white-space: nowrap;
    color: #FFF6E8;
    opacity: 0; transform: translateX(-6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .sas-fab:hover .sas-fab-label,
  .sas-fab:focus-visible .sas-fab-label {
    opacity: 1; transform: none;
    transition-delay: 0.12s;
  }

  /* ---------- Logout confirmation modal ---------- */
  .sas-modal-overlay {
    position: fixed; inset: 0; z-index: 900;
    background: rgba(30,5,5,0.50);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: sas-fade-in 0.16s ease;
  }
  @keyframes sas-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .sas-modal {
    width: 100%; max-width: 380px;
    background: #FFFCF7;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(60,0,0,0.34), 0 4px 14px rgba(0,0,0,0.16);
    text-align: center;
    animation: sas-pop-in 0.22s cubic-bezier(.3,1.4,.5,1);
  }
  @keyframes sas-pop-in {
    from { opacity: 0; transform: translateY(10px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .sas-modal-header {
    background: linear-gradient(135deg, ${MAROON_MID} 0%, ${MAROON_DEEP} 100%);
    padding: 26px 24px 20px;
  }
  .sas-modal-icon {
    width: 50px; height: 50px; border-radius: 50%;
    margin: 0 auto 14px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.22);
    border: 1.5px solid rgba(201,168,76,0.45);
    color: ${GOLD};
  }
  .sas-modal-title {
    font-family: ${FONT_DISPLAY};
    font-size: 17px; font-weight: 700; letter-spacing: 0.03em;
    color: #FDF0CE;
    margin: 0;
  }
  .sas-modal-body { padding: 22px 26px 26px; }
  .sas-modal-sub {
    font-family: ${FONT_SANS};
    font-size: 12.5px; color: ${TEXT_MUTED};
    line-height: 1.65; margin: 0 0 22px;
  }
  .sas-modal-actions { display: flex; gap: 10px; }
  .sas-modal-actions .sas-btn { flex: 1; padding: 11px 14px; }
  .sas-modal-actions .sas-btn.d {
    background: linear-gradient(135deg, #A30000 0%, ${MAROON_DEEP} 100%);
    border: none;
    color: #FDE7A8;
    font-weight: 700;
    box-shadow: 0 4px 14px rgba(90,0,0,0.35);
  }
  .sas-modal-actions .sas-btn.d:hover:not(:disabled) {
    background: linear-gradient(135deg, #C0392B 0%, #7B0000 100%);
    box-shadow: 0 6px 20px rgba(80,0,0,0.50);
    transform: translateY(-1px);
  }
  .sas-modal-actions .sas-btn.d:active:not(:disabled) { transform: translateY(0); }
`;

const ROLES = {
  student:         { label: 'Student',           bg: 'rgba(33,150,243,0.09)',  color: '#1565C0', border: 'rgba(33,150,243,0.22)' },
  library_manager: { label: 'Library Manager',   bg: 'rgba(123,0,0,0.09)',    color: '#7B0000', border: 'rgba(123,0,0,0.22)'   },
  admin:           { label: 'Administrator',     bg: 'rgba(201,168,76,0.11)', color: '#5C3A00', border: 'rgba(201,168,76,0.28)' },
  super_admin:     { label: 'Super Administrator', bg: 'rgba(201,168,76,0.16)', color: '#5C3A00', border: 'rgba(201,168,76,0.42)' },
};

function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <div className={`sas-toast ${ok ? 'ok' : 'err'}`}>
      {ok
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      {msg}
    </div>
  );
}

function LogoutConfirmModal({ onCancel, onConfirm, busy }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onCancel, busy]);

  return (
    <div className="sas-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div className="sas-modal" role="alertdialog" aria-modal="true" aria-labelledby="sas-modal-title">
        <div className="sas-modal-header">
          <div className="sas-modal-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H6a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 6 3h3"/>
              <polyline points="15.5 16 20 12 15.5 8"/>
              <line x1="20" y1="12" x2="8.5" y2="12"/>
            </svg>
          </div>
          <p className="sas-modal-title" id="sas-modal-title">Log out of LibraScan?</p>
        </div>
        <div className="sas-modal-body">
          <p className="sas-modal-sub">You'll be signed out of your Super Admin session on this device and returned to the login screen.</p>
          <div className="sas-modal-actions">
            <button className="sas-btn o" onClick={onCancel} disabled={busy}>Cancel</button>
            <button className="sas-btn d" onClick={onConfirm} disabled={busy}>
              {busy ? 'Logging out…' : 'Yes, Logout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingLogout({ onSignOut }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy]       = useState(false);

  const handleConfirmLogout = async () => {
    setBusy(true);
    try {
      await onSignOut();
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <>
      {/* Hover expands the button and reveals the label; clicking opens the confirmation dialog */}
      <button
        type="button"
        className="sas-fab"
        aria-label="Logout"
        onClick={() => setConfirm(true)}
      >
        <span className="sas-fab-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H6a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 6 3h3"/>
            <polyline points="15.5 16 20 12 15.5 8"/>
            <line x1="20" y1="12" x2="8.5" y2="12"/>
          </svg>
        </span>
        <span className="sas-fab-label">Logout</span>
      </button>

      {confirm && (
        <LogoutConfirmModal
          busy={busy}
          onCancel={() => !busy && setConfirm(false)}
          onConfirm={handleConfirmLogout}
        />
      )}
    </>
  );
}

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.student;
  return (
    <span className="sas-badge" style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
      {r.label}
    </span>
  );
}

function EyeBtn({ show, toggle }) {
  return (
    <button type="button" className="sas-eye" onClick={toggle} tabIndex={-1}>
      {show
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
      }
    </button>
  );
}

function PwField({ label, value, onChange, error, placeholder, autoComplete = 'new-password', disabled, required }) {
  const [show, setShow] = useState(false);
  return (
    <div className="sas-field">
      <label className="sas-label">
        {label}{required && <span className="sas-req">*</span>}
      </label>
      <div className="sas-pw-wrap">
        <input
          className={`sas-input${error ? ' e' : ''}`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <EyeBtn show={show} toggle={() => setShow(s => !s)} />
      </div>
      {error && <span className="sas-err">{error}</span>}
    </div>
  );
}

function Toggle({ id, checked, onChange, disabled }) {
  return (
    <label className="sas-toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <div className="sas-track"><div className="sas-thumb" /></div>
    </label>
  );
}

function ProfileTab({ profile, user, uid, onToast, onRefresh }) {
  const firstName  = profile?.first_name  || user?.user_metadata?.first_name  || '';
  const lastName   = profile?.last_name   || user?.user_metadata?.last_name   || '';
  const middleName = profile?.middle_name || '';
  const email      = user?.email || '';
  const role       = profile?.role || user?.user_metadata?.role || 'super_admin';
  const roleLabel  = ROLES[role]?.label || 'Super Administrator';
  const initials   = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'SA';

  // Field names below map to the columns that actually exist on
  // `profiles`: first_name, last_name, middle_name, username.
  const [form, setForm] = useState({
    first_name:  firstName,
    last_name:   lastName,
    middle_name: middleName,
    username:    profile?.username || '',
    email:       email,
  });
  useEffect(() => {
    setForm(f => ({
      ...f,
      first_name:  profile?.first_name  || user?.user_metadata?.first_name || '',
      last_name:   profile?.last_name   || user?.user_metadata?.last_name  || '',
      middle_name: profile?.middle_name || '',
      username:    profile?.username    || '',
      email:       user?.email          || '',
    }));
  }, [profile, user]);

  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || (user?.email ? user.email.split('@')[0] : 'Super Admin');
  const subtitle = ['Pampanga State University', roleLabel].filter(Boolean).join(', ');

  // Avatar upload / remove — same storage + profiles.avatar_url flow the
  // rest of the app uses, wired into the banner below.
  const [avBusy, setAvBusy] = useState(false);
  const [avPreview, setAvPreview] = useState(profile?.avatar_url || null);
  const avRef = useRef();
  useEffect(() => { setAvPreview(profile?.avatar_url || null); }, [profile?.avatar_url]);

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { onToast('Please select an image file (JPG, PNG, WebP).', false); return; }
    if (file.size > 2 * 1024 * 1024)     { onToast('Image must be under 2 MB.', false); return; }

    setAvPreview(URL.createObjectURL(file));
    setAvBusy(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${uid}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', uid);
      if (dbErr) throw dbErr;
      setAvPreview(url);
      onToast('Profile photo updated.', true);
      onRefresh?.();
    } catch (err) {
      onToast(err.message, false);
      setAvPreview(profile?.avatar_url || null);
    } finally { setAvBusy(false); e.target.value = ''; }
  };

  const handleAvatarRemove = async () => {
    setAvBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', uid);
      if (error) throw error;
      setAvPreview(null);
      onToast('Profile photo removed.', true);
      onRefresh?.();
    } catch (err) { onToast(err.message, false); }
    finally { setAvBusy(false); }
  };

  const handleSave = async () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required.';
    if (form.email.trim() !== email) {
      if (!form.email.trim()) {
        errs.email = 'Email address is required.';
      } else if (!/^[^\s@]+@pampangastateu\.edu\.ph$/.test(form.email.trim())) {
        errs.email = 'Email must be a @pampangastateu.edu.ph address.';
      }
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!uid) { onToast('Profile not found. Please refresh.', false); return; }
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from('profiles').update({
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        middle_name: form.middle_name.trim(),
        username:    form.username.trim(),
        updated_at:  new Date().toISOString(),
      }).eq('id', uid);
      if (pErr) throw pErr;
      const metaUpdate = { first_name: form.first_name.trim(), last_name: form.last_name.trim() };
      if (form.email.trim() && form.email.trim() !== email) {
        const { error: mErr } = await supabase.auth.updateUser({ email: form.email.trim(), data: metaUpdate });
        if (mErr) throw mErr;
        onToast('Profile updated. Check your new email inbox to confirm the change.', true);
      } else {
        const { error: mErr } = await supabase.auth.updateUser({ data: metaUpdate });
        if (mErr) throw mErr;
        onToast('Profile updated successfully.', true);
      }
      setEditing(false);
      onRefresh?.();
    } catch (err) { onToast(err.message, false); }
    finally { setSaving(false); }
  };

  const Field = ({ label, fkey, readOnly = false, type = 'text' }) => (
    <div className="sas-prof-field">
      <label className="sas-prof-flabel">{label}</label>
      {editing && !readOnly
        ? <input className="sas-prof-finput" type={type} value={form[fkey]} onChange={e => set(fkey, e.target.value)} />
        : <div className={`sas-prof-fvalue${form[fkey] ? '' : ' empty'}`}>{form[fkey] || 'Not set'}</div>
      }
      {errors[fkey] && <span className="sas-err" style={{ marginTop: 4 }}>{errors[fkey]}</span>}
    </div>
  );

  return (
    <div>
      {/* Banner */}
      <div className="sas-prof-banner">
        <div className="sas-prof-cover">
          {avPreview && (
            <button className="sas-prof-remove-btn" onClick={handleAvatarRemove} disabled={avBusy}>
              {avBusy
                ? <div className="s-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
              }
              {avBusy ? 'Removing…' : 'Remove photo'}
            </button>
          )}
          <div className="sas-prof-namewrap">
            <div className="sas-prof-name">{displayName.toUpperCase()}</div>
          </div>
        </div>

        {/* Avatar floats over the cover/subinfo boundary, matching the
            reference profile-header design. */}
        <div className="sas-prof-av-float">
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div className="sas-prof-avwrap">
              {avPreview
                ? <img src={avPreview} alt="avatar" onError={e => { e.target.style.display = 'none'; }} />
                : <span className="sas-prof-avinit">{initials}</span>
              }
            </div>
            <button className="sas-prof-cam-btn" onClick={() => avRef.current?.click()} disabled={avBusy} title="Change photo">
              {avBusy
                ? <div className="s-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
              }
            </button>
            <input ref={avRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
          </div>
        </div>
        <div className="sas-prof-subinfo">
          <div className="sas-prof-role">{subtitle}</div>
          <div className="sas-prof-emailrow">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16v16H4z" opacity="0"/><path d="M22 6l-10 7L2 6"/><rect x="2" y="4" width="20" height="16" rx="2"/>
            </svg>
            {email}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="sas-prof-panel">
        <div className="sas-prof-panel-hdr">
          <span className="sas-prof-panel-title">Personal Information</span>
          {editing ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="sas-btn o" style={{ padding: '6px 14px', fontSize: 11.5 }} onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button className="sas-btn p" style={{ padding: '6px 14px', fontSize: 11.5 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}><polyline points="20 6 9 17 4 12"/></svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          ) : (
            <button className="sas-btn o" style={{ padding: '6px 14px', fontSize: 11.5 }} onClick={() => setEditing(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        <div className="sas-prof-grid">
          <Field label="First Name"    fkey="first_name" />
          <Field label="Middle Name"   fkey="middle_name" />
          <Field label="Last Name"     fkey="last_name" />
          <Field label="Username"      fkey="username" />
          <Field label="Email Address" fkey="email" type="email" />
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ onToast }) {
  const [pw,     setPw]     = useState({ old: '', newPw: '', confirm: '' });
  const [pwErr,  setPwErr]  = useState({});
  const [pwBusy, setPwBusy] = useState(false);

  const setF = (k, v) => { setPw(p => ({ ...p, [k]: v })); setPwErr(e => ({ ...e, [k]: '' })); };

  const handleChangePw = async () => {
    const errs = {};
    if (!pw.old)                           errs.old     = 'Current password is required.';
    if (!pw.newPw)                         errs.newPw   = 'New password is required.';
    else if (pw.newPw.length < 8)          errs.newPw   = 'Minimum 8 characters.';
    else if (!/[A-Z]/.test(pw.newPw))     errs.newPw   = 'Include at least one uppercase letter (A–Z).';
    else if (!/[0-9]/.test(pw.newPw))     errs.newPw   = 'Include at least one number (0–9).';
    if (!pw.confirm)                       errs.confirm = 'Please confirm your new password.';
    else if (pw.newPw !== pw.confirm)      errs.confirm = 'Passwords do not match.';
    if (pw.old && pw.newPw && pw.old === pw.newPw)
      errs.newPw = 'New password must differ from your current one.';
    if (Object.keys(errs).length) { setPwErr(errs); return; }

    setPwBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: reErr } = await supabase.auth.signInWithPassword({
        email: user.email, password: pw.old,
      });
      if (reErr) {
        setPwErr({ old: 'Incorrect current password. Please try again.' });
        return;
      }
      const { error: upErr } = await supabase.auth.updateUser({ password: pw.newPw });
      if (upErr) throw upErr;
      setPw({ old: '', newPw: '', confirm: '' });
      onToast('Password updated successfully.', true);
    } catch (err) { onToast(err.message, false); }
    finally { setPwBusy(false); }
  };

  return (
    <div className="sas-grid">
      <div className="sas-card">
        <p className="sas-card-h">Change Password</p>
        <p className="sas-card-sub">Confirm your current password before setting a new one.</p>

        <PwField
          label="Current Password" required
          value={pw.old} onChange={e => setF('old', e.target.value)}
          error={pwErr.old} placeholder="Enter your current password"
          autoComplete="current-password" disabled={pwBusy}
        />

        <div className="sas-line" />

        <PwField
          label="New Password" required
          value={pw.newPw} onChange={e => setF('newPw', e.target.value)}
          error={pwErr.newPw} placeholder="Min. 8 chars · 1 uppercase · 1 number"
          disabled={pwBusy}
        />
        <PwField
          label="Confirm New Password" required
          value={pw.confirm} onChange={e => setF('confirm', e.target.value)}
          error={pwErr.confirm} placeholder="Re-enter your new password"
          disabled={pwBusy}
        />

        <div className="sas-tip">
          Password requirements: at least 8 characters, one uppercase letter (A–Z), and one number (0–9).
        </div>

        <div className="sas-btn-row">
          <button className="sas-btn p" onClick={handleChangePw} disabled={pwBusy}>
            {pwBusy ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      <div>
        <div className="sas-card" style={{ marginBottom: 20 }}>
          <p className="sas-card-h">Two-Factor Authentication</p>
          <p className="sas-card-sub">Require a one-time code from your phone in addition to your password at every sign-in.</p>

          <div className="sas-mfa-bar">
            <div>
              <div className="sas-mfa-label">Authenticator App (TOTP)</div>
              <div className="sas-mfa-desc">Disabled — toggle to begin setup.</div>
            </div>
            <div className="sas-mfa-right">
              <span className="sas-pill off">
                <span className="sas-dot" />
                Disabled
              </span>
              <Toggle
                id="sas-mfa-toggle"
                checked={false}
                onChange={() => {}}
                disabled={true}
              />
            </div>
          </div>

          <div className="sas-alert info">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              Two-factor authentication is coming soon. This feature is currently unavailable.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminSettings({ user, onSignOut }) {
  const { profile, refreshProfile } = useAuth();
  const [tab,   setTab]   = useState('profile');
  const [tMsg,  setTMsg]  = useState('');
  const [tOk,   setTOk]   = useState(true);

  const toast = (msg, ok = true) => {
    setTMsg(msg); setTOk(ok);
    setTimeout(() => setTMsg(''), 3500);
  };

  const TABS = [
    { id: 'profile',  label: 'Profile',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
    { id: 'security', label: 'Security',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  ];

  return (
    <div className="sas-wrap">
      <style>{CSS}</style>
      <Toast msg={tMsg} ok={tOk} />

      <div className="sas-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`sas-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile'  && <ProfileTab  profile={profile} user={user} uid={user?.id} onToast={toast} onRefresh={refreshProfile} />}
      {tab === 'security' && <SecurityTab onToast={toast} />}

      <FloatingLogout onSignOut={onSignOut} />
    </div>
  );
} 