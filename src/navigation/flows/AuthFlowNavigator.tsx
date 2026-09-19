import { useHisabApp } from '../HisabAppContext';

const AuthFlowNavigator = () => {
  const { renderAuthGate } = useHisabApp();
  return <>{renderAuthGate()}</>;
};

export default AuthFlowNavigator;
