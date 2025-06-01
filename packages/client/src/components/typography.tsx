export const Label = ({ children }: React.PropsWithChildren) => {
  return <h4 className="text-md font-medium text-gray-900 mb-3">{children}</h4>;
};

export const Subtitle = ({ children }: React.PropsWithChildren) => {
  return (
    <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
      {children}
    </h3>
  );
};

export const Subtitle2 = ({ children }: React.PropsWithChildren) => {
  return (
    <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
      {children}
    </div>
  );
};
