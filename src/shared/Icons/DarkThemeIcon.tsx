import type { SVGProps } from "react";

export default function DarkThemeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 128 72"
      className={`appearance-theme-illustration ${props.className ?? ""}`.trim()}
    >
      <g clipPath="url(#appearance-dark-clip)">
        <rect width="128" height="72" fill="#313131"></rect>
        <g filter="url(#appearance-dark-shadow-sidebar)">
          <path
            d="M8 16C8 11.5817 11.5817 8 16 8H128V72H8V16Z"
            fill="#222222"
          ></path>
        </g>
        <g filter="url(#appearance-dark-shadow-content)">
          <path
            d="M36 24C36 19.5817 39.5817 16 44 16H128V72H36V24Z"
            fill="#090909"
          ></path>
        </g>
        <path
          d="M25 16H19C17.3431 16 16 17.3431 16 19V25C16 26.6569 17.3431 28 19 28H25C26.6569 28 28 26.6569 28 25V19C28 17.3431 26.6569 16 25 16Z"
          fill="#2563eb"
        ></path>
        <path
          d="M25 34H19C17.3431 34 16 35.3431 16 37V43C16 44.6569 17.3431 46 19 46H25C26.6569 46 28 44.6569 28 43V37C28 35.3431 26.6569 34 25 34Z"
          fill="#313131"
        ></path>
        <path
          d="M25 52H19C17.3431 52 16 53.3431 16 55V61C16 62.6569 17.3431 64 19 64H25C26.6569 64 28 62.6569 28 61V55C28 53.3431 26.6569 52 25 52Z"
          fill="#313131"
        ></path>
        <path
          d="M58 24H46C44.8954 24 44 24.8954 44 26V28C44 29.1046 44.8954 30 46 30H58C59.1046 30 60 29.1046 60 28V26C60 24.8954 59.1046 24 58 24Z"
          fill="#313131"
        ></path>
        <path
          d="M118 24H116C114.895 24 114 24.8954 114 26V28C114 29.1046 114.895 30 116 30H118C119.105 30 120 29.1046 120 28V26C120 24.8954 119.105 24 118 24Z"
          fill="#313131"
        ></path>
        <path
          d="M66 34H46C44.8954 34 44 34.8954 44 36V38C44 39.1046 44.8954 40 46 40H66C67.1046 40 68 39.1046 68 38V36C68 34.8954 67.1046 34 66 34Z"
          fill="#313131"
        ></path>
        <path
          d="M75 48H57C55.3431 48 54 49.3431 54 51C54 52.6569 55.3431 54 57 54H75C76.6569 54 78 52.6569 78 51C78 49.3431 76.6569 48 75 48Z"
          fill="#313131"
        ></path>
        <path
          d="M103 48H85C83.3431 48 82 49.3431 82 51C82 52.6569 83.3431 54 85 54H103C104.657 54 106 52.6569 106 51C106 49.3431 104.657 48 103 48Z"
          fill="#313131"
        ></path>
        <path
          d="M86 34H74C72.8954 34 72 34.8954 72 36V38C72 39.1046 72.8954 40 74 40H86C87.1046 40 88 39.1046 88 38V36C88 34.8954 87.1046 34 86 34Z"
          fill="#2563eb"
        ></path>
        <circle cx="47" cy="51" r="3" fill="#2563eb"></circle>
      </g>
      <defs>
        <filter
          id="appearance-dark-shadow-sidebar"
          x="6"
          y="7"
          width="124"
          height="68"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          ></feColorMatrix>
          <feOffset dy="1"></feOffset>
          <feGaussianBlur stdDeviation="1"></feGaussianBlur>
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
          ></feColorMatrix>
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          ></feBlend>
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          ></feColorMatrix>
          <feOffset></feOffset>
          <feGaussianBlur stdDeviation="0.5"></feGaussianBlur>
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3333 0"
          ></feColorMatrix>
          <feBlend
            mode="normal"
            in2="effect1_dropShadow"
            result="effect2_dropShadow"
          ></feBlend>
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect2_dropShadow"
            result="shape"
          ></feBlend>
        </filter>
        <filter
          id="appearance-dark-shadow-content"
          x="34"
          y="15"
          width="96"
          height="60"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          ></feColorMatrix>
          <feOffset dy="1"></feOffset>
          <feGaussianBlur stdDeviation="1"></feGaussianBlur>
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
          ></feColorMatrix>
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow"
          ></feBlend>
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          ></feColorMatrix>
          <feOffset></feOffset>
          <feGaussianBlur stdDeviation="0.5"></feGaussianBlur>
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3333 0"
          ></feColorMatrix>
          <feBlend
            mode="normal"
            in2="effect1_dropShadow"
            result="effect2_dropShadow"
          ></feBlend>
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect2_dropShadow"
            result="shape"
          ></feBlend>
        </filter>
        <clipPath id="appearance-dark-clip">
          <rect width="128" height="72" fill="#fff"></rect>
        </clipPath>
      </defs>
    </svg>
  );
}
