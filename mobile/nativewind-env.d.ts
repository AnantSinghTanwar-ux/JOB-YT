/// <reference types="nativewind/types" />

declare module "*.css" {
  const content: any;
  export default content;
}

declare module "*.module.css" {
  const content: { [className: string]: string };
  export default content;
}

