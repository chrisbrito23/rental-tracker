function LoadingState({ message = 'Loading...' }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'200px',color:'#666',fontSize:'14px'}}>
      {message}
    </div>
  );
}

export default LoadingState;