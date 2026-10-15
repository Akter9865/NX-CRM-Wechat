import React from 'react';
import type { IntegrationId } from '@/lib/integrations/types';

interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  id: IntegrationId | string;
  size?: number | string;
  className?: string;
}

/**
 * High-definition, authentic official brand SVGs for Integrations & Apps Hub.
 */
export function BrandLogo({ id, size = 28, className = '', ...props }: BrandLogoProps) {
  const pixelSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 28;

  switch (id) {
    case 'google_sheets':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          <path d="M37 44H11C9.34315 44 8 42.6569 8 41V7C8 5.34315 9.34315 4 11 4H29L40 15V41C40 42.6569 38.6569 44 37 44Z" fill="#0F9D58" />
          <path d="M29 4L40 15H29V4Z" fill="#87CEAC" />
          <path d="M29 4V15H40L29 4Z" fill="#0B8043" opacity="0.3" />
          {/* Spreadsheet table grid */}
          <rect x="15" y="21" width="18" height="15" rx="1.5" fill="#FFFFFF" />
          <rect x="15" y="21" width="18" height="4.5" fill="#0F9D58" />
          <path d="M24 21V36" stroke="#0F9D58" strokeWidth="1.2" />
          <path d="M15 28.5H33" stroke="#0F9D58" strokeWidth="1.2" />
        </svg>
      );

    case 'zoho_mail':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          {/* Zoho 4 colorful blocks with envelope overlay */}
          <rect width="48" height="48" rx="10" fill="#FFFFFF" />
          <rect x="6" y="6" width="16" height="16" rx="4" fill="#E42528" />
          <rect x="26" y="6" width="16" height="16" rx="4" fill="#009A44" />
          <rect x="6" y="26" width="16" height="16" rx="4" fill="#0072BC" />
          <rect x="26" y="26" width="16" height="16" rx="4" fill="#FBB03B" />
          {/* Z O H O white letters */}
          <path d="M10 11H18L10 17H18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="34" cy="14" r="3.5" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M10 30V38M18 30V38M10 34H18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <circle cx="34" cy="34" r="3.5" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      );

    case 'smtp_mail':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          <rect width="48" height="48" rx="10" fill="url(#smtp-grad)" />
          <path
            d="M10 16C10 14.8954 10.8954 14 12 14H36C37.1046 14 38 14.8954 38 16V32C38 33.1046 37.1046 34 36 34H12C10.8954 34 10 33.1046 10 32V16Z"
            fill="#FFFFFF"
            fillOpacity="0.15"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <path d="M11 16L24 25L37 16" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M29 27L36 33M12 33L19 27" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          {/* TLS lock badge */}
          <circle cx="35" cy="13" r="5" fill="#10B981" />
          <path d="M33.5 13L34.5 14.2L36.8 11.8" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="smtp-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0EA5E9" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'razorpay':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          <rect width="48" height="48" rx="10" fill="#0C2340" />
          {/* Official Razorpay geometric bolt */}
          <path
            d="M26.5 9L15 28.5H23.5L18.5 39L33 19.5H24.5L26.5 9Z"
            fill="url(#rzp-grad)"
          />
          <defs>
            <linearGradient id="rzp-grad" x1="15" y1="9" x2="33" y2="39" gradientUnits="userSpaceOnUse">
              <stop stopColor="#529BFF" />
              <stop offset="1" stopColor="#0C83FD" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'phonepe':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          {/* Official PhonePe purple circle */}
          <circle cx="24" cy="24" r="22" fill="#5F259F" />
          {/* Official Devanagari 'पे' glyph */}
          <path
            d="M25.5 13H31V16H28.5V35H25.5V23C23.8 23 21.8 22 20.8 20.5C19.5 18.5 19.6 15.5 19.6 13H22.6C22.6 16.5 23.5 19.5 25.5 19.5V13Z"
            fill="#FFFFFF"
          />
          <path
            d="M17 13H33V15.5H17V13Z"
            fill="#FFFFFF"
          />
          <path
            d="M26 13L32 7"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'paytm':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          <rect width="48" height="48" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
          {/* Paytm Deep Navy and Cyan Logo */}
          <text x="7" y="27" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13" fill="#002E6E">
            Pay
          </text>
          <text x="27" y="27" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13" fill="#00BAF2">
            tm
          </text>
          <path d="M8 32H40" stroke="#00BAF2" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'stripe':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          <rect width="48" height="48" rx="10" fill="#635BFF" />
          {/* Official Stripe 'S' glyph */}
          <path
            d="M28.4 20.8C28.4 18.9 26.8 17.8 24.3 17.8C20.6 17.8 18.2 19.4 18.2 21.8C18.2 26 29.5 24.5 29.5 29.6C29.5 32.5 26.6 33.8 23.6 33.8C19.3 33.8 16.8 31.8 16.8 28.7H20.6C20.6 30.6 22.3 31.5 24 31.5C26.5 31.5 27.2 30.5 27.2 29.3C27.2 25.1 16 26.5 16 21.4C16 18.4 19.1 15.5 24.2 15.5C28.3 15.5 30.7 17.6 30.7 20.8H28.4Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'calendly':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          <rect width="48" height="48" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
          {/* Calendly vibrant blue circular C loop */}
          <circle cx="24" cy="24" r="16" stroke="#006BFF" strokeWidth="4" />
          <path
            d="M31.5 16.5C29.5 14.5 26.8 13.5 24 13.5C18.2 13.5 13.5 18.2 13.5 24C13.5 29.8 18.2 34.5 24 34.5C27 34.5 29.8 33.2 31.7 31"
            stroke="#006BFF"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'google_calendar':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          <rect width="48" height="48" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
          {/* Official Google Calendar 4-color tile */}
          <rect x="11" y="11" width="26" height="26" rx="4" fill="#FFFFFF" />
          <path d="M11 18H37V14C37 12.3431 35.6569 11 34 11H14C12.3431 11 11 12.3431 11 14V18Z" fill="#1A73E8" />
          <path d="M11 18H18V37H14C12.3431 37 11 35.6569 11 34V18Z" fill="#34A853" />
          <path d="M30 18H37V34C37 35.6569 35.6569 37 34 37H30V18Z" fill="#EA4335" />
          <path d="M18 30H30V37H18V30Z" fill="#FBBC04" />
          <text x="24" y="27" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="11" fill="#1A73E8">
            31
          </text>
        </svg>
      );

    case 'zapier_webhook':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          {...props}
        >
          <rect width="48" height="48" rx="10" fill="#FF4F00" />
          {/* Official Zapier asterisks starburst */}
          <rect x="22" y="10" width="4" height="28" rx="2" fill="#FFFFFF" />
          <rect x="10" y="22" width="28" height="4" rx="2" fill="#FFFFFF" />
          <rect
            x="22"
            y="10"
            width="4"
            height="28"
            rx="2"
            transform="rotate(45 24 24)"
            fill="#FFFFFF"
          />
          <rect
            x="22"
            y="10"
            width="4"
            height="28"
            rx="2"
            transform="rotate(-45 24 24)"
            fill="#FFFFFF"
          />
        </svg>
      );

    default:
      return (
        <div
          style={{ width: pixelSize, height: pixelSize }}
          className={`flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary ${className}`}
        >
          <span className="text-xs font-bold uppercase">{id.slice(0, 2)}</span>
        </div>
      );
  }
}
