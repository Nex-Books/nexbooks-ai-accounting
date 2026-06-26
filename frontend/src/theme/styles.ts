import { mode, StyleFunctionProps } from "@chakra-ui/theme-tools";

export const globalStyles = {
  colors: {
    brand: {
      100: "#DCF3E8",
      200: "#A8DFC5",
      300: "#74CBA2",
      400: "#5DC99A",
      500: "#51BC8F",
      600: "#3DA876",
      700: "#2D7D56",
      800: "#1D5238",
      900: "#0D2619",
    },
    brandScheme: {
      100: "#DCF3E8",
      200: "#74CBA2",
      300: "#5DC99A",
      400: "#51BC8F",
      500: "#51BC8F",
      600: "#3DA876",
      700: "#2D7D56",
      800: "#1D5238",
      900: "#0D2619",
    },
    brandTabs: {
      100: "#DCF3E8",
      200: "#51BC8F",
      300: "#51BC8F",
      400: "#51BC8F",
      500: "#51BC8F",
      600: "#3DA876",
      700: "#2D7D56",
      800: "#1D5238",
      900: "#0D2619",
    },
    secondaryGray: {
      100: "#F5F5F6",
      200: "#E3E5EA",
      300: "#FCFCFD",
      400: "#E3E5EA",
      500: "#AEB2B9",
      600: "#838589",
      700: "#676C73",
      800: "#505459",
      900: "#1B2559",
    },
    red: {
      100: "#FEEFEE",
      500: "#EE5D50",
      600: "#E31A1A",
    },
    blue: {
      50: "#EFF4FB",
      500: "#3965FF",
    },
    orange: {
      100: "#FFF6DA",
      500: "#FFB547",
    },
    green: {
      100: "#E6FAF5",
      500: "#01B574",
    },
    navy: {
      50: "#d0dcfb",
      100: "#aac0fe",
      200: "#a3b9f8",
      300: "#728fea",
      400: "#3652ba",
      500: "#1b3bbb",
      600: "#24388a",
      700: "#1B254B",
      800: "#111c44",
      900: "#0b1437",
    },
    gray: {
      100: "#FAFCFE",
    },
  },
  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        overflowX: "hidden",
        bg: mode("#FCFCFD", "navy.900")(props),
        fontFamily: "DM Sans",
        letterSpacing: "-0.5px",
      },
      input: {
        color: "gray.700",
      },
      html: {
        fontFamily: "DM Sans",
      },
    }),
  },
};
