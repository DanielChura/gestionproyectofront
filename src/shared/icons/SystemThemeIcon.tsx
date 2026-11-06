import type { SVGProps } from "react";

export default function SystemThemeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 128 72"
      className={`appearance-theme-illustration ${props.className ?? ""}`.trim()}
    >
      <g clip-path="url(#appearance-auto-clip-dark)">
        <path fill="#313131" d="M0 0H64V72H0z" transform="translate(64)"></path>
        <g filter="url(#appearance-auto-shadow-sidebar-dark)">
          <path fill="#222" d="M72 16a8 8 0 0 1 8-8h112v64H72z"></path>
        </g>
        <g filter="url(#appearance-auto-shadow-content-dark)">
          <path fill="#090909" d="M100 24a8 8 0 0 1 8-8h84v56h-92z"></path>
        </g>
        <path
          fill="#2563eb"
          d="M89 16h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3"
        ></path>
        <path
          fill="#313131"
          d="M89 34h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3M89 52h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3M122 24h-12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2M130 34h-20a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2M139 48h-18a3 3 0 1 0 0 6h18a3 3 0 1 0 0-6"
        ></path>
        <circle cx="111" cy="51" r="3" fill="#2563eb"></circle>
      </g>
      <g clip-path="url(#appearance-auto-clip-light)">
        <path fill="#e0e0e0" d="M0 0H64V72H0z"></path>
        <g filter="url(#appearance-auto-shadow-sidebar-light)">
          <path fill="#f9f9f9" d="M8 16a8 8 0 0 1 8-8h112v64H8z"></path>
        </g>
        <g filter="url(#appearance-auto-shadow-content-light)">
          <path fill="#f9f9f9" d="M36 24a8 8 0 0 1 8-8h84v56H36z"></path>
        </g>
        <path
          fill="#2563eb"
          d="M25 16h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3"
        ></path>
        <path
          fill="#e0e0e0"
          d="M25 34h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3M25 52h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3M58 24H46a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2M66 34H46a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2M75 48H57a3 3 0 1 0 0 6h18a3 3 0 1 0 0-6"
        ></path>
        <circle cx="47" cy="51" r="3" fill="#2563eb"></circle>
      </g>
      <defs>
        <filter
          id="appearance-auto-shadow-sidebar-dark"
          width="124"
          height="68"
          x="70"
          y="7"
          color-interpolation-filters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset dy="1"></feOffset>
          <feGaussianBlur stdDeviation="1"></feGaussianBlur>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"></feColorMatrix>
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          ></feBlend>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset></feOffset>
          <feGaussianBlur stdDeviation=".5"></feGaussianBlur>
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3333 0"></feColorMatrix>
          <feBlend
            in2="effect1_dropShadow"
            result="effect2_dropShadow"
          ></feBlend>
          <feBlend
            in="SourceGraphic"
            in2="effect2_dropShadow"
            result="shape"
          ></feBlend>
        </filter>
        <filter
          id="appearance-auto-shadow-content-dark"
          width="96"
          height="60"
          x="98"
          y="15"
          color-interpolation-filters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset dy="1"></feOffset>
          <feGaussianBlur stdDeviation="1"></feGaussianBlur>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"></feColorMatrix>
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          ></feBlend>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset></feOffset>
          <feGaussianBlur stdDeviation=".5"></feGaussianBlur>
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3333 0"></feColorMatrix>
          <feBlend
            in2="effect1_dropShadow"
            result="effect2_dropShadow"
          ></feBlend>
          <feBlend
            in="SourceGraphic"
            in2="effect2_dropShadow"
            result="shape"
          ></feBlend>
        </filter>
        <filter
          id="appearance-auto-shadow-sidebar-light"
          width="124"
          height="68"
          x="6"
          y="7"
          color-interpolation-filters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset dy="1"></feOffset>
          <feGaussianBlur stdDeviation="1"></feGaussianBlur>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"></feColorMatrix>
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          ></feBlend>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset></feOffset>
          <feGaussianBlur stdDeviation=".5"></feGaussianBlur>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2667 0"></feColorMatrix>
          <feBlend
            in2="effect1_dropShadow"
            result="effect2_dropShadow"
          ></feBlend>
          <feBlend
            in="SourceGraphic"
            in2="effect2_dropShadow"
            result="shape"
          ></feBlend>
        </filter>
        <filter
          id="appearance-auto-shadow-content-light"
          width="96"
          height="60"
          x="34"
          y="15"
          color-interpolation-filters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset dy="1"></feOffset>
          <feGaussianBlur stdDeviation="1"></feGaussianBlur>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"></feColorMatrix>
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          ></feBlend>
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          ></feColorMatrix>
          <feOffset></feOffset>
          <feGaussianBlur stdDeviation=".5"></feGaussianBlur>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2667 0"></feColorMatrix>
          <feBlend
            in2="effect1_dropShadow"
            result="effect2_dropShadow"
          ></feBlend>
          <feBlend
            in="SourceGraphic"
            in2="effect2_dropShadow"
            result="shape"
          ></feBlend>
        </filter>
        <clipPath id="appearance-auto-clip-dark">
          <path fill="#fff" d="M0 0H64V72H0z" transform="translate(64)"></path>
        </clipPath>
        <clipPath id="appearance-auto-clip-light">
          <path fill="#fff" d="M0 0H64V72H0z"></path>
        </clipPath>
      </defs>
    </svg>
  );
}
