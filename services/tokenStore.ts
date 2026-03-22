let _getToken: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (fn: (() => Promise<string | null>) | null) => {
  _getToken = fn;
};

export const getStoredToken = async (): Promise<string | null> => {
  return _getToken ? _getToken() : null;
};
