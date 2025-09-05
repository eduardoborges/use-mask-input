const isServer = !(
  typeof window !== 'undefined'
  && window.document?.createElement
);

export default isServer;
