export default function isServer() {
  return !(
    typeof window !== 'undefined'
    && window.document
    && window.document.createElement
  );
}
