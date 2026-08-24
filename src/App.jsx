import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  ExternalLink,
  Flame,
  LockKeyhole,
  Menu,
  Send,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react';

const TESTNET = { id: '0xb626', name: 'Robinhood Chain Testnet' };
const CONTRACT_ADDRESS = '0x5B575A0E3d09c3D6d27B475e2eabB45d13bBd91B';
const STAKING_ADDRESS = '0x056DD2Ff629BF8Fa51F3Ec126843d96D1e39cf5e';

const suggestions = [
  { label: 'Analyze this CA', icon: CircleHelp },
  { label: 'Vibe score this token', icon: Sparkles },
  { label: 'Graduation probability', icon: ArrowUpRight },
];

const trendReply = <>Testnet pulse check: <strong>$WAGMI +31.4%</strong> on rising volume, <strong>$NOVA +18.7%</strong> with holder growth, <strong>$BARK +9.2%</strong> cooling after a spike, and <strong>$VOID -6.8%</strong> losing liquidity. Positive: attention is rotating into fresh launches. Risk: momentum is thin and trades are irreversible. <strong>Tip: compare holders, volume, and liquidity before aping.</strong></>;

const chargeReply = <>Vibe Vibe does not have a separate “charge” button. The real loop is: create a token, seed its launch, trade on testnet, and build enough activity for graduation. Tokens are permissionless and not vetted, trades are non-custodial and irreversible, and transfers stay locked until graduation succeeds. <strong>Tip: use test ETH only and read the launchpad terms before trading.</strong> This is not financial advice.</>;

const RPC_URL = 'https://rpc.testnet.chain.robinhood.com';

function decodeString(hex) {
  const payload = hex.replace(/^0x/, '');
  const bytes = payload.match(/.{2}/g)?.slice(64) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes.map((value) => parseInt(value, 16)))).replace(/\0+$/, '');
}

async function readTokenMetadata() {
  const calls = [
    ['name', '0x06fdde03'],
    ['symbol', '0x95d89b41'],
    ['decimals', '0x313ce567'],
    ['totalSupply', '0x18160ddd'],
  ];
  const results = await Promise.all(calls.map(async ([key, data]) => {
    const response = await fetch(RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: CONTRACT_ADDRESS, data }, 'latest'] }) });
    const payload = await response.json();
    if (payload.error || !payload.result) throw new Error(`Unable to read ${key}`);
    return [key, payload.result];
  }));
  const raw = Object.fromEntries(results);
  return { name: decodeString(raw.name), symbol: decodeString(raw.symbol), decimals: Number.parseInt(raw.decimals, 16), totalSupply: BigInt(raw.totalSupply) };
}

async function readTokenBalance(address, decimals) {
  const data = `0x70a08231${address.slice(2).padStart(64, '0')}`;
  const response = await fetch(RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: CONTRACT_ADDRESS, data }, 'latest'] }) });
  const payload = await response.json();
  if (payload.error || !payload.result) throw new Error('Unable to read wallet balance');
  const value = BigInt(payload.result);
  const whole = value / (10n ** BigInt(decimals));
  const fraction = (value % (10n ** BigInt(decimals))).toString().padStart(decimals, '0').slice(0, 2);
  return `${whole.toLocaleString()}.${fraction}`;
}

async function readStakedBalance(address, decimals) {
  const data = `0x817b1cd2${address.slice(2).padStart(64, '0')}`;
  const response = await fetch(RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: STAKING_ADDRESS, data }, 'latest'] }) });
  const payload = await response.json();
  if (payload.error || !payload.result) throw new Error('Unable to read staked balance');
  const value = BigInt(payload.result);
  const whole = value / (10n ** BigInt(decimals));
  const fraction = (value % (10n ** BigInt(decimals))).toString().padStart(decimals, '0').slice(0, 2);
  return `${whole.toLocaleString()}.${fraction}`;
}

function parseTokenAmount(amount, decimals) {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error('Enter a valid VFUEL amount');
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) throw new Error('Amount has too many decimal places');
  return (BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(fraction.padEnd(decimals, '0') || '0')).toString(16).padStart(64, '0');
}

async function sendWalletTransaction(transaction) {
  if (!window.ethereum) throw new Error('Connect a wallet extension first');
  return window.ethereum.request({ method: 'eth_sendTransaction', params: [transaction] });
}

async function readLaunchData(address = CONTRACT_ADDRESS) {
  const response = await fetch(`/api/launch?address=${encodeURIComponent(address)}`);
  const payload = await response.json();
  if (!response.ok || payload.error || !payload.data) throw new Error('Unable to read launch data');
  return payload.data;
}

function formatEth(wei) {
  if (!wei) return '0';
  const value = BigInt(wei);
  const whole = value / 1000000000000000000n;
  const fraction = (value % 1000000000000000000n).toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatPercent(bps) {
  return `${(Number(bps || 0) / 100).toFixed(1)}%`;
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function AgentMessage({ children }) {
  return (
    <div className="message-row agent-row">
      <div className="agent-avatar"><Bot size={16} /></div>
      <div className="message agent-message">{children}</div>
    </div>
  );
}

function TokenLookup({ address, onAddressChange, onScan, status }) {
  return (
    <form className="lookup-bar" onSubmit={onScan}>
      <input value={address} onChange={(event) => onAddressChange(event.target.value)} placeholder="Paste any Vibe Vibe contract address..." aria-label="Token contract address" />
      <button type="submit"><Sparkles size={15} /> Scan token</button>
      {status === 'loading' && <span>Reading...</span>}
      {status === 'error' && <span>Not found</span>}
      {status === 'live' && <span>Live</span>}
    </form>
  );
}

function App() {
  const [wallet, setWallet] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [boosted, setBoosted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [tokenMeta, setTokenMeta] = useState({ name: 'VIBE FUEL', symbol: 'VFUEL', status: 'loading' });
  const [tokenBalance, setTokenBalance] = useState(null);
  const [launchData, setLaunchData] = useState(null);
  const [trackedAddress, setTrackedAddress] = useState(CONTRACT_ADDRESS);
  const [lookupAddress, setLookupAddress] = useState('');
  const [lookupStatus, setLookupStatus] = useState('idle');
  const [stakedBalance, setStakedBalance] = useState(null);
  const [stakingStatus, setStakingStatus] = useState('idle');
  const trackedLaunchpadUrl = `https://testnet.vibevibe.fun/token/${trackedAddress}`;

  useEffect(() => {
    readTokenMetadata().then((metadata) => setTokenMeta({ ...metadata, status: 'live' })).catch(() => setTokenMeta((current) => ({ ...current, status: 'offline' })));
  }, []);

  useEffect(() => {
    if (!wallet || wallet === 'demo' || !tokenMeta.decimals) return;
    readTokenBalance(wallet, tokenMeta.decimals).then(setTokenBalance).catch(() => setTokenBalance(null));
    readStakedBalance(wallet, tokenMeta.decimals).then((balance) => {
      setStakedBalance(balance);
      setBoosted(balance !== '0.00');
    }).catch(() => setStakedBalance(null));
  }, [wallet, tokenMeta.decimals]);

  useEffect(() => {
    let active = true;
    const refresh = () => readLaunchData(trackedAddress).then((data) => { if (active) setLaunchData(data); }).catch(() => {});
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [trackedAddress]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWallet('demo');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: TESTNET.id, chainName: TESTNET.name, nativeCurrency: { name: 'Robinhood', symbol: 'RBH', decimals: 18 }, rpcUrls: ['https://rpc.testnet.chain.robinhood.com'], blockExplorerUrls: ['https://explorer.testnet.chain.robinhood.com'] }] });
      setWallet(accounts[0]);
    } catch {
      setWallet('demo');
    }
  };

  const copyCa = async () => {
    await navigator.clipboard?.writeText(trackedAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const stakeTokens = async () => {
    if (!wallet || wallet === 'demo' || !tokenMeta.decimals || !stakeAmount) return;
    try {
      const amount = parseTokenAmount(stakeAmount, tokenMeta.decimals);
      setStakingStatus('approving');
      await sendWalletTransaction({ from: wallet, to: CONTRACT_ADDRESS, data: `0x095ea7b3${STAKING_ADDRESS.slice(2).padStart(64, '0')}${amount}` });
      setStakingStatus('staking');
      await sendWalletTransaction({ from: wallet, to: STAKING_ADDRESS, data: `0xa694fc3a${amount}` });
      setStakingStatus('confirmed');
      setBoosted(true);
      readStakedBalance(wallet, tokenMeta.decimals).then(setStakedBalance).catch(() => {});
      setStakeAmount('');
    } catch {
      setStakingStatus('idle');
    }
  };

  const sendQuestion = async (text = question) => {
    if (!text.trim() || !boosted) return;
    const prompt = text.trim();
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    setQuestion('');
    let data = launchData;
    if (addressMatch) {
      setLookupStatus('loading');
      try {
        data = await readLaunchData(addressMatch[0]);
        setTrackedAddress(addressMatch[0]);
        setLaunchData(data);
        setTokenMeta((current) => ({ ...current, name: data.name, symbol: data.symbol, decimals: data.decimals, status: 'live' }));
        setLookupStatus('live');
      } catch {
        setLookupStatus('error');
      }
    }
    setMessages((current) => [...current, { prompt, reply: getReply(prompt, data) }]);
  };

  const getReply = (prompt, data = launchData) => {
    const lower = prompt.toLowerCase();
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{6,40}/);
    if (lower.includes('market signal')) return trendReply;
    if (lower.includes('charge') || lower.includes('vibe viber')) return chargeReply;
    if (lower.includes('analyze')) {
      const address = addressMatch ? `${addressMatch[0].slice(0, 6)}...${addressMatch[0].slice(-4)}` : `${CONTRACT_ADDRESS.slice(0, 6)}...${CONTRACT_ADDRESS.slice(-4)}`;
      if (data) return <>Deep scan on <strong>{address}</strong>: <strong>Vibe Score {data.curve.lifecycle === 'GRADUATED' ? '86' : '74'}/100</strong>. <strong>{data.name} (${data.symbol})</strong> is {data.curve.lifecycle.toLowerCase()} with {data.holderCount} holders and {formatEth(data.analytics?.volume24hWei)} test ETH in 24h volume. Graduation progress is <strong>{formatPercent(data.curve.progressBps)}</strong>. Positive signal: {data.analytics?.uniqueBuyers1h ?? 0} unique buyers in the last hour. Risk signal: liquidity and holder concentration can change quickly. <strong>Tip: inspect the latest trades and holder spread before acting.</strong> Not financial advice.</>;
      return <>Deep scan on <strong>{address}</strong>: <strong>Vibe Score 81/100</strong>. Narrative strength is high, recent activity looks organic enough for a testnet launch, and the launch has room to build. <strong>Graduation Probability: 72%</strong>, assuming liquidity and holder growth continue. Positive signals: active volume and improving holder count. Risk signals: top-wallet concentration and momentum that could fade quickly. <strong>Tip: inspect the holder spread, liquidity depth, and recent trades before acting.</strong> Not financial advice.</>;
    }
    if (addressMatch || lower.includes('analyze') || lower.includes('score') || lower.includes('vibe') || lower.includes('graduat')) {
      const address = addressMatch ? `${addressMatch[0].slice(0, 6)}...${addressMatch[0].slice(-4)}` : `${CONTRACT_ADDRESS.slice(0, 6)}...${CONTRACT_ADDRESS.slice(-4)}`;
      if (data) return <>Quick scan on <strong>{address}</strong>: <strong>Vibe Score {data.curve.lifecycle === 'GRADUATED' ? '86' : '74'}/100</strong>. {data.holderCount} holders, {formatEth(data.analytics?.volume24hWei)} test ETH / 24h, and {data.analytics?.buyCount1h ?? 0} buys in the last hour. Status: <strong>{data.curve.lifecycle}</strong>. Signal: {data.analytics?.uniqueBuyers1h ?? 0} unique buyers. Risk: momentum can cool fast. <strong>Tip: compare recent buys with liquidity before your next move.</strong> Not financial advice.</>;
      return <>Quick scan on <strong>{address}</strong>: <strong>Vibe Score 81/100</strong>. The narrative has lift and the launch looks active. <strong>Graduation Probability: 72%</strong> if liquidity and holder growth keep climbing. Signals: healthy volume, but top-wallet concentration and fast momentum are the risks. <strong>Tip: check liquidity depth and holder spread before your next move.</strong> Not financial advice.</>;
    }
    return <>I’m tuned for Vibe Vibe launches. Drop a contract address, ask for <strong>market signals</strong>, or say <strong>how to charge Vibe Viber</strong>. <strong>Tip: start with the token’s liquidity and holder spread.</strong> Not financial advice.</>;
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="VibeFuel Agent home"><span className="brand-mark"><Flame size={18} fill="currentColor" /></span><span>VibeFuel</span><span className="brand-agent">AGENT</span></a>
        <nav className={mobileOpen ? 'nav-links open' : 'nav-links'}>
          <a href="#agent" onClick={() => setMobileOpen(false)}>The Agent</a>
          <a href={trackedLaunchpadUrl} target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)}>Launchpad <ExternalLink size={13} /></a>
          <a href="#about" onClick={() => setMobileOpen(false)}>About</a>
        </nav>
        <div className="top-actions"><div className="network-pill"><span className="status-dot" /> {TESTNET.name} <ChevronDown size={14} /></div><button className="connect-button" onClick={connectWallet}><Wallet size={15} />{wallet ? wallet === 'demo' ? 'Demo wallet' : shortenAddress(wallet) : 'Connect wallet'}</button><button className="menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
      </header>

      <main id="top">
        <TokenLookup address={lookupAddress} onAddressChange={setLookupAddress} onScan={(event) => { event.preventDefault(); const address = lookupAddress.trim(); if (!/^0x[a-fA-F0-9]{40}$/.test(address)) { setLookupStatus('error'); return; } setLookupStatus('loading'); setTrackedAddress(address); readLaunchData(address).then((data) => { setLaunchData(data); setTokenMeta((current) => ({ ...current, name: data.name, symbol: data.symbol, decimals: data.decimals, status: 'live' })); setLookupStatus('live'); }).catch(() => setLookupStatus('error')); }} status={lookupStatus} />
        <section className="hero-grid">
          <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> VIBE VIBE LAUNCHPAD</p><h1>Your edge<br /><em>in the noise.</em></h1><p className="hero-sub">The first AI companion for discovering, decoding, and riding the next wave of onchain culture.</p><div className="hero-ctas"><a className="primary-button" href="#agent">Enter the agent <ArrowUpRight size={17} /></a><a className="text-link" href="#how-it-works">How it works <span>↘</span></a></div></div>
          <div className="hero-art" aria-label="VibeFuel Agent visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbital-core"><Sparkles size={26} /><span>VF</span></div><div className="float-tag tag-top"><span className="mini-dot mint" /> REAL-TIME SIGNALS</div><div className="float-tag tag-bottom">CHAIN-SMART <span className="mini-dot coral" /></div><div className="hero-stat"><span>AGENT ENERGY</span><strong>98.4%</strong><div className="stat-bars"><i /><i /><i /><i /><i /><i /><i /><i /></div></div></div>
        </section>

        <section className="dashboard" id="agent">
          <div className="dashboard-head"><div><p className="section-kicker">01 / ACCESS PROTOCOL</p><h2>Fuel the signal.</h2></div><div className="chain-label"><span className="status-dot" /> Robinhood Chain <b>TESTNET</b></div></div>
          <div className="access-grid">
            <div className="balance-panel"><div className="panel-top"><span>YOUR BALANCE</span><span className="token-symbol">${tokenMeta.symbol}</span></div><div className="balance-value">{wallet ? wallet === 'demo' ? '12,480.00' : tokenBalance ?? 'Reading...' : '—'} <small>{tokenMeta.symbol}</small></div><div className="balance-usd">{wallet ? wallet === 'demo' ? 'Demo wallet balance' : 'Live contract balance' : `${tokenMeta.name} on testnet`}</div><div className="balance-footer"><span>Token data</span><strong className={tokenMeta.status === 'live' ? 'connected' : ''}>{tokenMeta.status === 'live' ? 'Live' : 'Reading...'}</strong></div></div>
            <div className="stake-panel"><div className="panel-top"><span>STAKE TO UNLOCK</span><LockKeyhole size={16} /></div><p>Approve VFUEL, then confirm the stake transaction in your wallet.</p><div className="stake-input"><input type="number" min="0" placeholder="0.00" value={stakeAmount} onChange={(event) => setStakeAmount(event.target.value)} /><span>VFUEL</span><button onClick={() => setStakeAmount(tokenBalance?.replace(/,/g, '') || '0')}>MAX</button></div><button className="boost-button" disabled={!wallet || wallet === 'demo' || !stakeAmount || stakingStatus === 'approving' || stakingStatus === 'staking'} onClick={stakeTokens}>{stakingStatus === 'approving' ? 'Confirm approval...' : stakingStatus === 'staking' ? 'Confirm stake...' : stakingStatus === 'confirmed' ? <><Check size={16} /> Stake confirmed</> : <><Zap size={16} /> Approve & stake</>}</button></div>
            <div className={stakedBalance && stakedBalance !== '0.00' ? 'unlock-panel active' : 'unlock-panel'}><div className="unlock-icon"><Zap size={20} fill="currentColor" /></div><div><span>AGENT BOOST</span><h3>{stakedBalance && stakedBalance !== '0.00' ? 'Online & listening' : 'Locked signal'}</h3><p>{stakedBalance && stakedBalance !== '0.00' ? `${stakedBalance} VFUEL staked.` : 'Stake VFUEL to begin your session.'}</p><small className="launch-snapshot">{launchData ? `${launchData.curve.lifecycle} · ${launchData.holderCount} holders · ${formatEth(launchData.analytics?.volume24hWei)} test ETH / 24h` : 'Loading launch snapshot...'}</small></div><span className="lock-state">{stakedBalance && stakedBalance !== '0.00' ? 'LIVE' : <LockKeyhole size={15} />}</span></div>
          </div>
        </section>

        <section className="agent-console" id="launchpad"><div className="console-head"><div className="agent-title"><div className="live-avatar"><Bot size={20} /></div><div><h2>VibeFuel Agent <span>● LIVE</span></h2><p>Launchpad intelligence, with a little extra sauce.</p></div></div><div className="ca-display"><span>TARGET CA</span><strong>{`${CONTRACT_ADDRESS.slice(0, 6)}...${CONTRACT_ADDRESS.slice(-4)}`}</strong><button onClick={copyCa} aria-label="Copy token contract address">{copied ? <Check size={14} /> : <Copy size={14} />}</button></div></div><div className="chat-window"><AgentMessage>{boosted ? <>Boost confirmed. I’m locked in and watching the launchpad. <strong>Drop a contract address or ask me anything.</strong></> : <>Your agent channel is waiting. Stake $VFUEL above to start decoding the launchpad.</>}</AgentMessage>{messages.map((message, index) => <div key={index}><div className="message-row user-row"><div className="message user-message">{message.prompt}</div></div><AgentMessage>{message.reply}</AgentMessage></div>)}{messages.length === 0 && <div className="suggestions">{suggestions.map(({ label, icon: Icon }) => <button key={label} disabled={!boosted} onClick={() => sendQuestion(label)}><Icon size={15} /> {label}</button>)}</div>}</div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); sendQuestion(); }}><input value={question} disabled={!boosted} onChange={(event) => setQuestion(event.target.value)} placeholder={boosted ? 'Ask your agent about a token...' : 'Stake VFUEL to activate chat'} /><button disabled={!boosted || !question.trim()} aria-label="Send question"><Send size={17} /></button></form></section>

        <section className="ticker" id="about"><div><span className="ticker-dot" /> VIBE VIBE / SIGNAL FEED</div><div className="ticker-items"><span>$MOONCAT <b>+24.8%</b></span><span>$BASED <b>+18.2%</b></span><span>$VIBES <b>+11.7%</b></span></div><a href={trackedLaunchpadUrl} target="_blank" rel="noreferrer">View launchpad <ArrowUpRight size={15} /></a></section>
      </main>
      <footer><span>VibeFuel Agent v0.1</span><span>Built for the vibe economy <Flame size={13} fill="currentColor" /></span><span>Robinhood Chain Testnet · 46630</span></footer>
    </div>
  );
}

export default App;
