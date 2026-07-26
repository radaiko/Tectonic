(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))s(l);new MutationObserver(l=>{for(const c of l)if(c.type==="childList")for(const f of c.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&s(f)}).observe(document,{childList:!0,subtree:!0});function n(l){const c={};return l.integrity&&(c.integrity=l.integrity),l.referrerPolicy&&(c.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?c.credentials="include":l.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function s(l){if(l.ep)return;l.ep=!0;const c=n(l);fetch(l.href,c)}})();var yh={exports:{}},Bo={};var Qx;function uS(){if(Qx)return Bo;Qx=1;var r=Symbol.for("react.transitional.element"),t=Symbol.for("react.fragment");function n(s,l,c){var f=null;if(c!==void 0&&(f=""+c),l.key!==void 0&&(f=""+l.key),"key"in l){c={};for(var d in l)d!=="key"&&(c[d]=l[d])}else c=l;return l=c.ref,{$$typeof:r,type:s,key:f,ref:l!==void 0?l:null,props:c}}return Bo.Fragment=t,Bo.jsx=n,Bo.jsxs=n,Bo}var Jx;function fS(){return Jx||(Jx=1,yh.exports=uS()),yh.exports}var he=fS(),Sh={exports:{}},de={};var $x;function hS(){if($x)return de;$x=1;var r=Symbol.for("react.transitional.element"),t=Symbol.for("react.portal"),n=Symbol.for("react.fragment"),s=Symbol.for("react.strict_mode"),l=Symbol.for("react.profiler"),c=Symbol.for("react.consumer"),f=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),m=Symbol.for("react.suspense"),p=Symbol.for("react.memo"),x=Symbol.for("react.lazy"),g=Symbol.for("react.activity"),_=Symbol.iterator;function S(N){return N===null||typeof N!="object"?null:(N=_&&N[_]||N["@@iterator"],typeof N=="function"?N:null)}var b={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},A=Object.assign,M={};function y(N,it,_t){this.props=N,this.context=it,this.refs=M,this.updater=_t||b}y.prototype.isReactComponent={},y.prototype.setState=function(N,it){if(typeof N!="object"&&typeof N!="function"&&N!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,N,it,"setState")},y.prototype.forceUpdate=function(N){this.updater.enqueueForceUpdate(this,N,"forceUpdate")};function z(){}z.prototype=y.prototype;function w(N,it,_t){this.props=N,this.context=it,this.refs=M,this.updater=_t||b}var O=w.prototype=new z;O.constructor=w,A(O,y.prototype),O.isPureReactComponent=!0;var k=Array.isArray;function P(){}var F={H:null,A:null,T:null,S:null},Q=Object.prototype.hasOwnProperty;function D(N,it,_t){var Rt=_t.ref;return{$$typeof:r,type:N,key:it,ref:Rt!==void 0?Rt:null,props:_t}}function C(N,it){return D(N.type,it,N.props)}function H(N){return typeof N=="object"&&N!==null&&N.$$typeof===r}function nt(N){var it={"=":"=0",":":"=2"};return"$"+N.replace(/[=:]/g,function(_t){return it[_t]})}var ct=/\/+/g;function pt(N,it){return typeof N=="object"&&N!==null&&N.key!=null?nt(""+N.key):it.toString(36)}function lt(N){switch(N.status){case"fulfilled":return N.value;case"rejected":throw N.reason;default:switch(typeof N.status=="string"?N.then(P,P):(N.status="pending",N.then(function(it){N.status==="pending"&&(N.status="fulfilled",N.value=it)},function(it){N.status==="pending"&&(N.status="rejected",N.reason=it)})),N.status){case"fulfilled":return N.value;case"rejected":throw N.reason}}throw N}function B(N,it,_t,Rt,Gt){var at=typeof N;(at==="undefined"||at==="boolean")&&(N=null);var ut=!1;if(N===null)ut=!0;else switch(at){case"bigint":case"string":case"number":ut=!0;break;case"object":switch(N.$$typeof){case r:case t:ut=!0;break;case x:return ut=N._init,B(ut(N._payload),it,_t,Rt,Gt)}}if(ut)return Gt=Gt(N),ut=Rt===""?"."+pt(N,0):Rt,k(Gt)?(_t="",ut!=null&&(_t=ut.replace(ct,"$&/")+"/"),B(Gt,it,_t,"",function(Zt){return Zt})):Gt!=null&&(H(Gt)&&(Gt=C(Gt,_t+(Gt.key==null||N&&N.key===Gt.key?"":(""+Gt.key).replace(ct,"$&/")+"/")+ut)),it.push(Gt)),1;ut=0;var Ot=Rt===""?".":Rt+":";if(k(N))for(var Ht=0;Ht<N.length;Ht++)Rt=N[Ht],at=Ot+pt(Rt,Ht),ut+=B(Rt,it,_t,at,Gt);else if(Ht=S(N),typeof Ht=="function")for(N=Ht.call(N),Ht=0;!(Rt=N.next()).done;)Rt=Rt.value,at=Ot+pt(Rt,Ht++),ut+=B(Rt,it,_t,at,Gt);else if(at==="object"){if(typeof N.then=="function")return B(lt(N),it,_t,Rt,Gt);throw it=String(N),Error("Objects are not valid as a React child (found: "+(it==="[object Object]"?"object with keys {"+Object.keys(N).join(", ")+"}":it)+"). If you meant to render a collection of children, use an array instead.")}return ut}function q(N,it,_t){if(N==null)return N;var Rt=[],Gt=0;return B(N,Rt,"","",function(at){return it.call(_t,at,Gt++)}),Rt}function j(N){if(N._status===-1){var it=N._result;it=it(),it.then(function(_t){(N._status===0||N._status===-1)&&(N._status=1,N._result=_t)},function(_t){(N._status===0||N._status===-1)&&(N._status=2,N._result=_t)}),N._status===-1&&(N._status=0,N._result=it)}if(N._status===1)return N._result.default;throw N._result}var xt=typeof reportError=="function"?reportError:function(N){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var it=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof N=="object"&&N!==null&&typeof N.message=="string"?String(N.message):String(N),error:N});if(!window.dispatchEvent(it))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",N);return}console.error(N)},vt={map:q,forEach:function(N,it,_t){q(N,function(){it.apply(this,arguments)},_t)},count:function(N){var it=0;return q(N,function(){it++}),it},toArray:function(N){return q(N,function(it){return it})||[]},only:function(N){if(!H(N))throw Error("React.Children.only expected to receive a single React element child.");return N}};return de.Activity=g,de.Children=vt,de.Component=y,de.Fragment=n,de.Profiler=l,de.PureComponent=w,de.StrictMode=s,de.Suspense=m,de.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=F,de.__COMPILER_RUNTIME={__proto__:null,c:function(N){return F.H.useMemoCache(N)}},de.cache=function(N){return function(){return N.apply(null,arguments)}},de.cacheSignal=function(){return null},de.cloneElement=function(N,it,_t){if(N==null)throw Error("The argument must be a React element, but you passed "+N+".");var Rt=A({},N.props),Gt=N.key;if(it!=null)for(at in it.key!==void 0&&(Gt=""+it.key),it)!Q.call(it,at)||at==="key"||at==="__self"||at==="__source"||at==="ref"&&it.ref===void 0||(Rt[at]=it[at]);var at=arguments.length-2;if(at===1)Rt.children=_t;else if(1<at){for(var ut=Array(at),Ot=0;Ot<at;Ot++)ut[Ot]=arguments[Ot+2];Rt.children=ut}return D(N.type,Gt,Rt)},de.createContext=function(N){return N={$$typeof:f,_currentValue:N,_currentValue2:N,_threadCount:0,Provider:null,Consumer:null},N.Provider=N,N.Consumer={$$typeof:c,_context:N},N},de.createElement=function(N,it,_t){var Rt,Gt={},at=null;if(it!=null)for(Rt in it.key!==void 0&&(at=""+it.key),it)Q.call(it,Rt)&&Rt!=="key"&&Rt!=="__self"&&Rt!=="__source"&&(Gt[Rt]=it[Rt]);var ut=arguments.length-2;if(ut===1)Gt.children=_t;else if(1<ut){for(var Ot=Array(ut),Ht=0;Ht<ut;Ht++)Ot[Ht]=arguments[Ht+2];Gt.children=Ot}if(N&&N.defaultProps)for(Rt in ut=N.defaultProps,ut)Gt[Rt]===void 0&&(Gt[Rt]=ut[Rt]);return D(N,at,Gt)},de.createRef=function(){return{current:null}},de.forwardRef=function(N){return{$$typeof:d,render:N}},de.isValidElement=H,de.lazy=function(N){return{$$typeof:x,_payload:{_status:-1,_result:N},_init:j}},de.memo=function(N,it){return{$$typeof:p,type:N,compare:it===void 0?null:it}},de.startTransition=function(N){var it=F.T,_t={};F.T=_t;try{var Rt=N(),Gt=F.S;Gt!==null&&Gt(_t,Rt),typeof Rt=="object"&&Rt!==null&&typeof Rt.then=="function"&&Rt.then(P,xt)}catch(at){xt(at)}finally{it!==null&&_t.types!==null&&(it.types=_t.types),F.T=it}},de.unstable_useCacheRefresh=function(){return F.H.useCacheRefresh()},de.use=function(N){return F.H.use(N)},de.useActionState=function(N,it,_t){return F.H.useActionState(N,it,_t)},de.useCallback=function(N,it){return F.H.useCallback(N,it)},de.useContext=function(N){return F.H.useContext(N)},de.useDebugValue=function(){},de.useDeferredValue=function(N,it){return F.H.useDeferredValue(N,it)},de.useEffect=function(N,it){return F.H.useEffect(N,it)},de.useEffectEvent=function(N){return F.H.useEffectEvent(N)},de.useId=function(){return F.H.useId()},de.useImperativeHandle=function(N,it,_t){return F.H.useImperativeHandle(N,it,_t)},de.useInsertionEffect=function(N,it){return F.H.useInsertionEffect(N,it)},de.useLayoutEffect=function(N,it){return F.H.useLayoutEffect(N,it)},de.useMemo=function(N,it){return F.H.useMemo(N,it)},de.useOptimistic=function(N,it){return F.H.useOptimistic(N,it)},de.useReducer=function(N,it,_t){return F.H.useReducer(N,it,_t)},de.useRef=function(N){return F.H.useRef(N)},de.useState=function(N){return F.H.useState(N)},de.useSyncExternalStore=function(N,it,_t){return F.H.useSyncExternalStore(N,it,_t)},de.useTransition=function(){return F.H.useTransition()},de.version="19.2.8",de}var tg;function ep(){return tg||(tg=1,Sh.exports=hS()),Sh.exports}var zn=ep(),Mh={exports:{}},Fo={},bh={exports:{}},Eh={};var eg;function dS(){return eg||(eg=1,(function(r){function t(B,q){var j=B.length;B.push(q);t:for(;0<j;){var xt=j-1>>>1,vt=B[xt];if(0<l(vt,q))B[xt]=q,B[j]=vt,j=xt;else break t}}function n(B){return B.length===0?null:B[0]}function s(B){if(B.length===0)return null;var q=B[0],j=B.pop();if(j!==q){B[0]=j;t:for(var xt=0,vt=B.length,N=vt>>>1;xt<N;){var it=2*(xt+1)-1,_t=B[it],Rt=it+1,Gt=B[Rt];if(0>l(_t,j))Rt<vt&&0>l(Gt,_t)?(B[xt]=Gt,B[Rt]=j,xt=Rt):(B[xt]=_t,B[it]=j,xt=it);else if(Rt<vt&&0>l(Gt,j))B[xt]=Gt,B[Rt]=j,xt=Rt;else break t}}return q}function l(B,q){var j=B.sortIndex-q.sortIndex;return j!==0?j:B.id-q.id}if(r.unstable_now=void 0,typeof performance=="object"&&typeof performance.now=="function"){var c=performance;r.unstable_now=function(){return c.now()}}else{var f=Date,d=f.now();r.unstable_now=function(){return f.now()-d}}var m=[],p=[],x=1,g=null,_=3,S=!1,b=!1,A=!1,M=!1,y=typeof setTimeout=="function"?setTimeout:null,z=typeof clearTimeout=="function"?clearTimeout:null,w=typeof setImmediate<"u"?setImmediate:null;function O(B){for(var q=n(p);q!==null;){if(q.callback===null)s(p);else if(q.startTime<=B)s(p),q.sortIndex=q.expirationTime,t(m,q);else break;q=n(p)}}function k(B){if(A=!1,O(B),!b)if(n(m)!==null)b=!0,P||(P=!0,nt());else{var q=n(p);q!==null&&lt(k,q.startTime-B)}}var P=!1,F=-1,Q=5,D=-1;function C(){return M?!0:!(r.unstable_now()-D<Q)}function H(){if(M=!1,P){var B=r.unstable_now();D=B;var q=!0;try{t:{b=!1,A&&(A=!1,z(F),F=-1),S=!0;var j=_;try{e:{for(O(B),g=n(m);g!==null&&!(g.expirationTime>B&&C());){var xt=g.callback;if(typeof xt=="function"){g.callback=null,_=g.priorityLevel;var vt=xt(g.expirationTime<=B);if(B=r.unstable_now(),typeof vt=="function"){g.callback=vt,O(B),q=!0;break e}g===n(m)&&s(m),O(B)}else s(m);g=n(m)}if(g!==null)q=!0;else{var N=n(p);N!==null&&lt(k,N.startTime-B),q=!1}}break t}finally{g=null,_=j,S=!1}q=void 0}}finally{q?nt():P=!1}}}var nt;if(typeof w=="function")nt=function(){w(H)};else if(typeof MessageChannel<"u"){var ct=new MessageChannel,pt=ct.port2;ct.port1.onmessage=H,nt=function(){pt.postMessage(null)}}else nt=function(){y(H,0)};function lt(B,q){F=y(function(){B(r.unstable_now())},q)}r.unstable_IdlePriority=5,r.unstable_ImmediatePriority=1,r.unstable_LowPriority=4,r.unstable_NormalPriority=3,r.unstable_Profiling=null,r.unstable_UserBlockingPriority=2,r.unstable_cancelCallback=function(B){B.callback=null},r.unstable_forceFrameRate=function(B){0>B||125<B?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):Q=0<B?Math.floor(1e3/B):5},r.unstable_getCurrentPriorityLevel=function(){return _},r.unstable_next=function(B){switch(_){case 1:case 2:case 3:var q=3;break;default:q=_}var j=_;_=q;try{return B()}finally{_=j}},r.unstable_requestPaint=function(){M=!0},r.unstable_runWithPriority=function(B,q){switch(B){case 1:case 2:case 3:case 4:case 5:break;default:B=3}var j=_;_=B;try{return q()}finally{_=j}},r.unstable_scheduleCallback=function(B,q,j){var xt=r.unstable_now();switch(typeof j=="object"&&j!==null?(j=j.delay,j=typeof j=="number"&&0<j?xt+j:xt):j=xt,B){case 1:var vt=-1;break;case 2:vt=250;break;case 5:vt=1073741823;break;case 4:vt=1e4;break;default:vt=5e3}return vt=j+vt,B={id:x++,callback:q,priorityLevel:B,startTime:j,expirationTime:vt,sortIndex:-1},j>xt?(B.sortIndex=j,t(p,B),n(m)===null&&B===n(p)&&(A?(z(F),F=-1):A=!0,lt(k,j-xt))):(B.sortIndex=vt,t(m,B),b||S||(b=!0,P||(P=!0,nt()))),B},r.unstable_shouldYield=C,r.unstable_wrapCallback=function(B){var q=_;return function(){var j=_;_=q;try{return B.apply(this,arguments)}finally{_=j}}}})(Eh)),Eh}var ng;function pS(){return ng||(ng=1,bh.exports=dS()),bh.exports}var Th={exports:{}},Nn={};var ig;function mS(){if(ig)return Nn;ig=1;var r=ep();function t(m){var p="https://react.dev/errors/"+m;if(1<arguments.length){p+="?args[]="+encodeURIComponent(arguments[1]);for(var x=2;x<arguments.length;x++)p+="&args[]="+encodeURIComponent(arguments[x])}return"Minified React error #"+m+"; visit "+p+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function n(){}var s={d:{f:n,r:function(){throw Error(t(522))},D:n,C:n,L:n,m:n,X:n,S:n,M:n},p:0,findDOMNode:null},l=Symbol.for("react.portal");function c(m,p,x){var g=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:l,key:g==null?null:""+g,children:m,containerInfo:p,implementation:x}}var f=r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;function d(m,p){if(m==="font")return"";if(typeof p=="string")return p==="use-credentials"?p:""}return Nn.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=s,Nn.createPortal=function(m,p){var x=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!p||p.nodeType!==1&&p.nodeType!==9&&p.nodeType!==11)throw Error(t(299));return c(m,p,null,x)},Nn.flushSync=function(m){var p=f.T,x=s.p;try{if(f.T=null,s.p=2,m)return m()}finally{f.T=p,s.p=x,s.d.f()}},Nn.preconnect=function(m,p){typeof m=="string"&&(p?(p=p.crossOrigin,p=typeof p=="string"?p==="use-credentials"?p:"":void 0):p=null,s.d.C(m,p))},Nn.prefetchDNS=function(m){typeof m=="string"&&s.d.D(m)},Nn.preinit=function(m,p){if(typeof m=="string"&&p&&typeof p.as=="string"){var x=p.as,g=d(x,p.crossOrigin),_=typeof p.integrity=="string"?p.integrity:void 0,S=typeof p.fetchPriority=="string"?p.fetchPriority:void 0;x==="style"?s.d.S(m,typeof p.precedence=="string"?p.precedence:void 0,{crossOrigin:g,integrity:_,fetchPriority:S}):x==="script"&&s.d.X(m,{crossOrigin:g,integrity:_,fetchPriority:S,nonce:typeof p.nonce=="string"?p.nonce:void 0})}},Nn.preinitModule=function(m,p){if(typeof m=="string")if(typeof p=="object"&&p!==null){if(p.as==null||p.as==="script"){var x=d(p.as,p.crossOrigin);s.d.M(m,{crossOrigin:x,integrity:typeof p.integrity=="string"?p.integrity:void 0,nonce:typeof p.nonce=="string"?p.nonce:void 0})}}else p==null&&s.d.M(m)},Nn.preload=function(m,p){if(typeof m=="string"&&typeof p=="object"&&p!==null&&typeof p.as=="string"){var x=p.as,g=d(x,p.crossOrigin);s.d.L(m,x,{crossOrigin:g,integrity:typeof p.integrity=="string"?p.integrity:void 0,nonce:typeof p.nonce=="string"?p.nonce:void 0,type:typeof p.type=="string"?p.type:void 0,fetchPriority:typeof p.fetchPriority=="string"?p.fetchPriority:void 0,referrerPolicy:typeof p.referrerPolicy=="string"?p.referrerPolicy:void 0,imageSrcSet:typeof p.imageSrcSet=="string"?p.imageSrcSet:void 0,imageSizes:typeof p.imageSizes=="string"?p.imageSizes:void 0,media:typeof p.media=="string"?p.media:void 0})}},Nn.preloadModule=function(m,p){if(typeof m=="string")if(p){var x=d(p.as,p.crossOrigin);s.d.m(m,{as:typeof p.as=="string"&&p.as!=="script"?p.as:void 0,crossOrigin:x,integrity:typeof p.integrity=="string"?p.integrity:void 0})}else s.d.m(m)},Nn.requestFormReset=function(m){s.d.r(m)},Nn.unstable_batchedUpdates=function(m,p){return m(p)},Nn.useFormState=function(m,p,x){return f.H.useFormState(m,p,x)},Nn.useFormStatus=function(){return f.H.useHostTransitionStatus()},Nn.version="19.2.8",Nn}var ag;function xS(){if(ag)return Th.exports;ag=1;function r(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r)}catch(t){console.error(t)}}return r(),Th.exports=mS(),Th.exports}var sg;function gS(){if(sg)return Fo;sg=1;var r=pS(),t=ep(),n=xS();function s(e){var i="https://react.dev/errors/"+e;if(1<arguments.length){i+="?args[]="+encodeURIComponent(arguments[1]);for(var a=2;a<arguments.length;a++)i+="&args[]="+encodeURIComponent(arguments[a])}return"Minified React error #"+e+"; visit "+i+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function l(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function c(e){var i=e,a=e;if(e.alternate)for(;i.return;)i=i.return;else{e=i;do i=e,(i.flags&4098)!==0&&(a=i.return),e=i.return;while(e)}return i.tag===3?a:null}function f(e){if(e.tag===13){var i=e.memoizedState;if(i===null&&(e=e.alternate,e!==null&&(i=e.memoizedState)),i!==null)return i.dehydrated}return null}function d(e){if(e.tag===31){var i=e.memoizedState;if(i===null&&(e=e.alternate,e!==null&&(i=e.memoizedState)),i!==null)return i.dehydrated}return null}function m(e){if(c(e)!==e)throw Error(s(188))}function p(e){var i=e.alternate;if(!i){if(i=c(e),i===null)throw Error(s(188));return i!==e?null:e}for(var a=e,o=i;;){var u=a.return;if(u===null)break;var h=u.alternate;if(h===null){if(o=u.return,o!==null){a=o;continue}break}if(u.child===h.child){for(h=u.child;h;){if(h===a)return m(u),e;if(h===o)return m(u),i;h=h.sibling}throw Error(s(188))}if(a.return!==o.return)a=u,o=h;else{for(var v=!1,T=u.child;T;){if(T===a){v=!0,a=u,o=h;break}if(T===o){v=!0,o=u,a=h;break}T=T.sibling}if(!v){for(T=h.child;T;){if(T===a){v=!0,a=h,o=u;break}if(T===o){v=!0,o=h,a=u;break}T=T.sibling}if(!v)throw Error(s(189))}}if(a.alternate!==o)throw Error(s(190))}if(a.tag!==3)throw Error(s(188));return a.stateNode.current===a?e:i}function x(e){var i=e.tag;if(i===5||i===26||i===27||i===6)return e;for(e=e.child;e!==null;){if(i=x(e),i!==null)return i;e=e.sibling}return null}var g=Object.assign,_=Symbol.for("react.element"),S=Symbol.for("react.transitional.element"),b=Symbol.for("react.portal"),A=Symbol.for("react.fragment"),M=Symbol.for("react.strict_mode"),y=Symbol.for("react.profiler"),z=Symbol.for("react.consumer"),w=Symbol.for("react.context"),O=Symbol.for("react.forward_ref"),k=Symbol.for("react.suspense"),P=Symbol.for("react.suspense_list"),F=Symbol.for("react.memo"),Q=Symbol.for("react.lazy"),D=Symbol.for("react.activity"),C=Symbol.for("react.memo_cache_sentinel"),H=Symbol.iterator;function nt(e){return e===null||typeof e!="object"?null:(e=H&&e[H]||e["@@iterator"],typeof e=="function"?e:null)}var ct=Symbol.for("react.client.reference");function pt(e){if(e==null)return null;if(typeof e=="function")return e.$$typeof===ct?null:e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case A:return"Fragment";case y:return"Profiler";case M:return"StrictMode";case k:return"Suspense";case P:return"SuspenseList";case D:return"Activity"}if(typeof e=="object")switch(e.$$typeof){case b:return"Portal";case w:return e.displayName||"Context";case z:return(e._context.displayName||"Context")+".Consumer";case O:var i=e.render;return e=e.displayName,e||(e=i.displayName||i.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case F:return i=e.displayName||null,i!==null?i:pt(e.type)||"Memo";case Q:i=e._payload,e=e._init;try{return pt(e(i))}catch{}}return null}var lt=Array.isArray,B=t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,q=n.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,j={pending:!1,data:null,method:null,action:null},xt=[],vt=-1;function N(e){return{current:e}}function it(e){0>vt||(e.current=xt[vt],xt[vt]=null,vt--)}function _t(e,i){vt++,xt[vt]=e.current,e.current=i}var Rt=N(null),Gt=N(null),at=N(null),ut=N(null);function Ot(e,i){switch(_t(at,i),_t(Gt,e),_t(Rt,null),i.nodeType){case 9:case 11:e=(e=i.documentElement)&&(e=e.namespaceURI)?yx(e):0;break;default:if(e=i.tagName,i=i.namespaceURI)i=yx(i),e=Sx(i,e);else switch(e){case"svg":e=1;break;case"math":e=2;break;default:e=0}}it(Rt),_t(Rt,e)}function Ht(){it(Rt),it(Gt),it(at)}function Zt(e){e.memoizedState!==null&&_t(ut,e);var i=Rt.current,a=Sx(i,e.type);i!==a&&(_t(Gt,e),_t(Rt,a))}function pe(e){Gt.current===e&&(it(Rt),it(Gt)),ut.current===e&&(it(ut),No._currentValue=j)}var Pe,oe;function yt(e){if(Pe===void 0)try{throw Error()}catch(a){var i=a.stack.trim().match(/\n( *(at )?)/);Pe=i&&i[1]||"",oe=-1<a.stack.indexOf(`
    at`)?" (<anonymous>)":-1<a.stack.indexOf("@")?"@unknown:0:0":""}return`
`+Pe+e+oe}var L=!1;function bt(e,i){if(!e||L)return"";L=!0;var a=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var o={DetermineComponentFrameRoot:function(){try{if(i){var mt=function(){throw Error()};if(Object.defineProperty(mt.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(mt,[])}catch(rt){var et=rt}Reflect.construct(e,[],mt)}else{try{mt.call()}catch(rt){et=rt}e.call(mt.prototype)}}else{try{throw Error()}catch(rt){et=rt}(mt=e())&&typeof mt.catch=="function"&&mt.catch(function(){})}}catch(rt){if(rt&&et&&typeof rt.stack=="string")return[rt.stack,et.stack]}return[null,null]}};o.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var u=Object.getOwnPropertyDescriptor(o.DetermineComponentFrameRoot,"name");u&&u.configurable&&Object.defineProperty(o.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var h=o.DetermineComponentFrameRoot(),v=h[0],T=h[1];if(v&&T){var I=v.split(`
`),$=T.split(`
`);for(u=o=0;o<I.length&&!I[o].includes("DetermineComponentFrameRoot");)o++;for(;u<$.length&&!$[u].includes("DetermineComponentFrameRoot");)u++;if(o===I.length||u===$.length)for(o=I.length-1,u=$.length-1;1<=o&&0<=u&&I[o]!==$[u];)u--;for(;1<=o&&0<=u;o--,u--)if(I[o]!==$[u]){if(o!==1||u!==1)do if(o--,u--,0>u||I[o]!==$[u]){var ht=`
`+I[o].replace(" at new "," at ");return e.displayName&&ht.includes("<anonymous>")&&(ht=ht.replace("<anonymous>",e.displayName)),ht}while(1<=o&&0<=u);break}}}finally{L=!1,Error.prepareStackTrace=a}return(a=e?e.displayName||e.name:"")?yt(a):""}function Ct(e,i){switch(e.tag){case 26:case 27:case 5:return yt(e.type);case 16:return yt("Lazy");case 13:return e.child!==i&&i!==null?yt("Suspense Fallback"):yt("Suspense");case 19:return yt("SuspenseList");case 0:case 15:return bt(e.type,!1);case 11:return bt(e.type.render,!1);case 1:return bt(e.type,!0);case 31:return yt("Activity");default:return""}}function Dt(e){try{var i="",a=null;do i+=Ct(e,a),a=e,e=e.return;while(e);return i}catch(o){return`
Error generating stack: `+o.message+`
`+o.stack}}var Tt=Object.prototype.hasOwnProperty,Wt=r.unstable_scheduleCallback,Pt=r.unstable_cancelCallback,kt=r.unstable_shouldYield,U=r.unstable_requestPaint,E=r.unstable_now,K=r.unstable_getCurrentPriorityLevel,ft=r.unstable_ImmediatePriority,St=r.unstable_UserBlockingPriority,ot=r.unstable_NormalPriority,$t=r.unstable_LowPriority,zt=r.unstable_IdlePriority,ee=r.log,Qt=r.unstable_setDisableYieldValue,Mt=null,At=null;function te(e){if(typeof ee=="function"&&Qt(e),At&&typeof At.setStrictMode=="function")try{At.setStrictMode(Mt,e)}catch{}}var Kt=Math.clz32?Math.clz32:G,Vt=Math.log,ce=Math.LN2;function G(e){return e>>>=0,e===0?32:31-(Vt(e)/ce|0)|0}var Bt=256,Ut=262144,Lt=4194304;function Et(e){var i=e&42;if(i!==0)return i;switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:return 64;case 128:return 128;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:return e&261888;case 262144:case 524288:case 1048576:case 2097152:return e&3932160;case 4194304:case 8388608:case 16777216:case 33554432:return e&62914560;case 67108864:return 67108864;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 0;default:return e}}function gt(e,i,a){var o=e.pendingLanes;if(o===0)return 0;var u=0,h=e.suspendedLanes,v=e.pingedLanes;e=e.warmLanes;var T=o&134217727;return T!==0?(o=T&~h,o!==0?u=Et(o):(v&=T,v!==0?u=Et(v):a||(a=T&~e,a!==0&&(u=Et(a))))):(T=o&~h,T!==0?u=Et(T):v!==0?u=Et(v):a||(a=o&~e,a!==0&&(u=Et(a)))),u===0?0:i!==0&&i!==u&&(i&h)===0&&(h=u&-u,a=i&-i,h>=a||h===32&&(a&4194048)!==0)?i:u}function qt(e,i){return(e.pendingLanes&~(e.suspendedLanes&~e.pingedLanes)&i)===0}function ue(e,i){switch(e){case 1:case 2:case 4:case 8:case 64:return i+250;case 16:case 32:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return i+5e3;case 4194304:case 8388608:case 16777216:case 33554432:return-1;case 67108864:case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function He(){var e=Lt;return Lt<<=1,(Lt&62914560)===0&&(Lt=4194304),e}function De(e){for(var i=[],a=0;31>a;a++)i.push(e);return i}function Ln(e,i){e.pendingLanes|=i,i!==268435456&&(e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0)}function Kn(e,i,a,o,u,h){var v=e.pendingLanes;e.pendingLanes=a,e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0,e.expiredLanes&=a,e.entangledLanes&=a,e.errorRecoveryDisabledLanes&=a,e.shellSuspendCounter=0;var T=e.entanglements,I=e.expirationTimes,$=e.hiddenUpdates;for(a=v&~a;0<a;){var ht=31-Kt(a),mt=1<<ht;T[ht]=0,I[ht]=-1;var et=$[ht];if(et!==null)for($[ht]=null,ht=0;ht<et.length;ht++){var rt=et[ht];rt!==null&&(rt.lane&=-536870913)}a&=~mt}o!==0&&ol(e,o,0),h!==0&&u===0&&e.tag!==0&&(e.suspendedLanes|=h&~(v&~i))}function ol(e,i,a){e.pendingLanes|=i,e.suspendedLanes&=~i;var o=31-Kt(i);e.entangledLanes|=i,e.entanglements[o]=e.entanglements[o]|1073741824|a&261930}function Xr(e,i){var a=e.entangledLanes|=i;for(e=e.entanglements;a;){var o=31-Kt(a),u=1<<o;u&i|e[o]&i&&(e[o]|=i),a&=~u}}function Wr(e,i){var a=i&-i;return a=(a&42)!==0?1:Si(a),(a&(e.suspendedLanes|i))!==0?0:a}function Si(e){switch(e){case 2:e=1;break;case 8:e=4;break;case 32:e=16;break;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:e=128;break;case 268435456:e=134217728;break;default:e=0}return e}function as(e){return e&=-e,2<e?8<e?(e&134217727)!==0?32:268435456:8:2}function qr(){var e=q.p;return e!==0?e:(e=window.event,e===void 0?32:Xx(e.type))}function Yr(e,i){var a=q.p;try{return q.p=e,i()}finally{q.p=a}}var Qn=Math.random().toString(36).slice(2),ln="__reactFiber$"+Qn,pn="__reactProps$"+Qn,Vi="__reactContainer$"+Qn,zs="__reactEvents$"+Qn,du="__reactListeners$"+Qn,pu="__reactHandles$"+Qn,ll="__reactResources$"+Qn,ss="__reactMarker$"+Qn;function jr(e){delete e[ln],delete e[pn],delete e[zs],delete e[du],delete e[pu]}function Sa(e){var i=e[ln];if(i)return i;for(var a=e.parentNode;a;){if(i=a[Vi]||a[ln]){if(a=i.alternate,i.child!==null||a!==null&&a.child!==null)for(e=Cx(e);e!==null;){if(a=e[ln])return a;e=Cx(e)}return i}e=a,a=e.parentNode}return null}function R(e){if(e=e[ln]||e[Vi]){var i=e.tag;if(i===5||i===6||i===13||i===31||i===26||i===27||i===3)return e}return null}function X(e){var i=e.tag;if(i===5||i===26||i===27||i===6)return e.stateNode;throw Error(s(33))}function st(e){var i=e[ll];return i||(i=e[ll]={hoistableStyles:new Map,hoistableScripts:new Map}),i}function tt(e){e[ss]=!0}var Z=new Set,wt={};function Ft(e,i){Xt(e,i),Xt(e+"Capture",i)}function Xt(e,i){for(wt[e]=i,e=0;e<i.length;e++)Z.add(i[e])}var Yt=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),se={},le={};function ne(e){return Tt.call(le,e)?!0:Tt.call(se,e)?!1:Yt.test(e)?le[e]=!0:(se[e]=!0,!1)}function xe(e,i,a){if(ne(i))if(a===null)e.removeAttribute(i);else{switch(typeof a){case"undefined":case"function":case"symbol":e.removeAttribute(i);return;case"boolean":var o=i.toLowerCase().slice(0,5);if(o!=="data-"&&o!=="aria-"){e.removeAttribute(i);return}}e.setAttribute(i,""+a)}}function we(e,i,a){if(a===null)e.removeAttribute(i);else{switch(typeof a){case"undefined":case"function":case"symbol":case"boolean":e.removeAttribute(i);return}e.setAttribute(i,""+a)}}function Ue(e,i,a,o){if(o===null)e.removeAttribute(a);else{switch(typeof o){case"undefined":case"function":case"symbol":case"boolean":e.removeAttribute(a);return}e.setAttributeNS(i,a,""+o)}}function Ae(e){switch(typeof e){case"bigint":case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function Be(e){var i=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(i==="checkbox"||i==="radio")}function ae(e,i,a){var o=Object.getOwnPropertyDescriptor(e.constructor.prototype,i);if(!e.hasOwnProperty(i)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var u=o.get,h=o.set;return Object.defineProperty(e,i,{configurable:!0,get:function(){return u.call(this)},set:function(v){a=""+v,h.call(this,v)}}),Object.defineProperty(e,i,{enumerable:o.enumerable}),{getValue:function(){return a},setValue:function(v){a=""+v},stopTracking:function(){e._valueTracker=null,delete e[i]}}}}function qe(e){if(!e._valueTracker){var i=Be(e)?"checked":"value";e._valueTracker=ae(e,i,""+e[i])}}function Re(e){if(!e)return!1;var i=e._valueTracker;if(!i)return!0;var a=i.getValue(),o="";return e&&(o=Be(e)?e.checked?"true":"false":e.value),e=o,e!==a?(i.setValue(e),!0):!1}function yn(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}var Ma=/[\n"\\]/g;function je(e){return e.replace(Ma,function(i){return"\\"+i.charCodeAt(0).toString(16)+" "})}function ki(e,i,a,o,u,h,v,T){e.name="",v!=null&&typeof v!="function"&&typeof v!="symbol"&&typeof v!="boolean"?e.type=v:e.removeAttribute("type"),i!=null?v==="number"?(i===0&&e.value===""||e.value!=i)&&(e.value=""+Ae(i)):e.value!==""+Ae(i)&&(e.value=""+Ae(i)):v!=="submit"&&v!=="reset"||e.removeAttribute("value"),i!=null?Sn(e,v,Ae(i)):a!=null?Sn(e,v,Ae(a)):o!=null&&e.removeAttribute("value"),u==null&&h!=null&&(e.defaultChecked=!!h),u!=null&&(e.checked=u&&typeof u!="function"&&typeof u!="symbol"),T!=null&&typeof T!="function"&&typeof T!="symbol"&&typeof T!="boolean"?e.name=""+Ae(T):e.removeAttribute("name")}function Ze(e,i,a,o,u,h,v,T){if(h!=null&&typeof h!="function"&&typeof h!="symbol"&&typeof h!="boolean"&&(e.type=h),i!=null||a!=null){if(!(h!=="submit"&&h!=="reset"||i!=null)){qe(e);return}a=a!=null?""+Ae(a):"",i=i!=null?""+Ae(i):a,T||i===e.value||(e.value=i),e.defaultValue=i}o=o??u,o=typeof o!="function"&&typeof o!="symbol"&&!!o,e.checked=T?e.checked:!!o,e.defaultChecked=!!o,v!=null&&typeof v!="function"&&typeof v!="symbol"&&typeof v!="boolean"&&(e.name=v),qe(e)}function Sn(e,i,a){i==="number"&&yn(e.ownerDocument)===e||e.defaultValue===""+a||(e.defaultValue=""+a)}function mn(e,i,a,o){if(e=e.options,i){i={};for(var u=0;u<a.length;u++)i["$"+a[u]]=!0;for(a=0;a<e.length;a++)u=i.hasOwnProperty("$"+e[a].value),e[a].selected!==u&&(e[a].selected=u),u&&o&&(e[a].defaultSelected=!0)}else{for(a=""+Ae(a),i=null,u=0;u<e.length;u++){if(e[u].value===a){e[u].selected=!0,o&&(e[u].defaultSelected=!0);return}i!==null||e[u].disabled||(i=e[u])}i!==null&&(i.selected=!0)}}function Mn(e,i,a){if(i!=null&&(i=""+Ae(i),i!==e.value&&(e.value=i),a==null)){e.defaultValue!==i&&(e.defaultValue=i);return}e.defaultValue=a!=null?""+Ae(a):""}function An(e,i,a,o){if(i==null){if(o!=null){if(a!=null)throw Error(s(92));if(lt(o)){if(1<o.length)throw Error(s(93));o=o[0]}a=o}a==null&&(a=""),i=a}a=Ae(i),e.defaultValue=a,o=e.textContent,o===a&&o!==""&&o!==null&&(e.value=o),qe(e)}function wi(e,i){if(i){var a=e.firstChild;if(a&&a===e.lastChild&&a.nodeType===3){a.nodeValue=i;return}}e.textContent=i}var Xi=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));function gp(e,i,a){var o=i.indexOf("--")===0;a==null||typeof a=="boolean"||a===""?o?e.setProperty(i,""):i==="float"?e.cssFloat="":e[i]="":o?e.setProperty(i,a):typeof a!="number"||a===0||Xi.has(i)?i==="float"?e.cssFloat=a:e[i]=(""+a).trim():e[i]=a+"px"}function _p(e,i,a){if(i!=null&&typeof i!="object")throw Error(s(62));if(e=e.style,a!=null){for(var o in a)!a.hasOwnProperty(o)||i!=null&&i.hasOwnProperty(o)||(o.indexOf("--")===0?e.setProperty(o,""):o==="float"?e.cssFloat="":e[o]="");for(var u in i)o=i[u],i.hasOwnProperty(u)&&a[u]!==o&&gp(e,u,o)}else for(var h in i)i.hasOwnProperty(h)&&gp(e,h,i[h])}function mu(e){if(e.indexOf("-")===-1)return!1;switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var rv=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),ov=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function cl(e){return ov.test(""+e)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":e}function Wi(){}var xu=null;function gu(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Bs=null,Fs=null;function vp(e){var i=R(e);if(i&&(e=i.stateNode)){var a=e[pn]||null;t:switch(e=i.stateNode,i.type){case"input":if(ki(e,a.value,a.defaultValue,a.defaultValue,a.checked,a.defaultChecked,a.type,a.name),i=a.name,a.type==="radio"&&i!=null){for(a=e;a.parentNode;)a=a.parentNode;for(a=a.querySelectorAll('input[name="'+je(""+i)+'"][type="radio"]'),i=0;i<a.length;i++){var o=a[i];if(o!==e&&o.form===e.form){var u=o[pn]||null;if(!u)throw Error(s(90));ki(o,u.value,u.defaultValue,u.defaultValue,u.checked,u.defaultChecked,u.type,u.name)}}for(i=0;i<a.length;i++)o=a[i],o.form===e.form&&Re(o)}break t;case"textarea":Mn(e,a.value,a.defaultValue);break t;case"select":i=a.value,i!=null&&mn(e,!!a.multiple,i,!1)}}}var _u=!1;function yp(e,i,a){if(_u)return e(i,a);_u=!0;try{var o=e(i);return o}finally{if(_u=!1,(Bs!==null||Fs!==null)&&(Kl(),Bs&&(i=Bs,e=Fs,Fs=Bs=null,vp(i),e)))for(i=0;i<e.length;i++)vp(e[i])}}function Zr(e,i){var a=e.stateNode;if(a===null)return null;var o=a[pn]||null;if(o===null)return null;a=o[i];t:switch(i){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(o=!o.disabled)||(e=e.type,o=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!o;break t;default:e=!1}if(e)return null;if(a&&typeof a!="function")throw Error(s(231,i,typeof a));return a}var qi=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),vu=!1;if(qi)try{var Kr={};Object.defineProperty(Kr,"passive",{get:function(){vu=!0}}),window.addEventListener("test",Kr,Kr),window.removeEventListener("test",Kr,Kr)}catch{vu=!1}var ba=null,yu=null,ul=null;function Sp(){if(ul)return ul;var e,i=yu,a=i.length,o,u="value"in ba?ba.value:ba.textContent,h=u.length;for(e=0;e<a&&i[e]===u[e];e++);var v=a-e;for(o=1;o<=v&&i[a-o]===u[h-o];o++);return ul=u.slice(e,1<o?1-o:void 0)}function fl(e){var i=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&i===13&&(e=13)):e=i,e===10&&(e=13),32<=e||e===13?e:0}function hl(){return!0}function Mp(){return!1}function Hn(e){function i(a,o,u,h,v){this._reactName=a,this._targetInst=u,this.type=o,this.nativeEvent=h,this.target=v,this.currentTarget=null;for(var T in e)e.hasOwnProperty(T)&&(a=e[T],this[T]=a?a(h):h[T]);return this.isDefaultPrevented=(h.defaultPrevented!=null?h.defaultPrevented:h.returnValue===!1)?hl:Mp,this.isPropagationStopped=Mp,this}return g(i.prototype,{preventDefault:function(){this.defaultPrevented=!0;var a=this.nativeEvent;a&&(a.preventDefault?a.preventDefault():typeof a.returnValue!="unknown"&&(a.returnValue=!1),this.isDefaultPrevented=hl)},stopPropagation:function(){var a=this.nativeEvent;a&&(a.stopPropagation?a.stopPropagation():typeof a.cancelBubble!="unknown"&&(a.cancelBubble=!0),this.isPropagationStopped=hl)},persist:function(){},isPersistent:hl}),i}var rs={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},dl=Hn(rs),Qr=g({},rs,{view:0,detail:0}),lv=Hn(Qr),Su,Mu,Jr,pl=g({},Qr,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Eu,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==Jr&&(Jr&&e.type==="mousemove"?(Su=e.screenX-Jr.screenX,Mu=e.screenY-Jr.screenY):Mu=Su=0,Jr=e),Su)},movementY:function(e){return"movementY"in e?e.movementY:Mu}}),bp=Hn(pl),cv=g({},pl,{dataTransfer:0}),uv=Hn(cv),fv=g({},Qr,{relatedTarget:0}),bu=Hn(fv),hv=g({},rs,{animationName:0,elapsedTime:0,pseudoElement:0}),dv=Hn(hv),pv=g({},rs,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),mv=Hn(pv),xv=g({},rs,{data:0}),Ep=Hn(xv),gv={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},_v={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},vv={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function yv(e){var i=this.nativeEvent;return i.getModifierState?i.getModifierState(e):(e=vv[e])?!!i[e]:!1}function Eu(){return yv}var Sv=g({},Qr,{key:function(e){if(e.key){var i=gv[e.key]||e.key;if(i!=="Unidentified")return i}return e.type==="keypress"?(e=fl(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?_v[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Eu,charCode:function(e){return e.type==="keypress"?fl(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?fl(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Mv=Hn(Sv),bv=g({},pl,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Tp=Hn(bv),Ev=g({},Qr,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Eu}),Tv=Hn(Ev),Av=g({},rs,{propertyName:0,elapsedTime:0,pseudoElement:0}),Rv=Hn(Av),Cv=g({},pl,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),wv=Hn(Cv),Dv=g({},rs,{newState:0,oldState:0}),Uv=Hn(Dv),Lv=[9,13,27,32],Tu=qi&&"CompositionEvent"in window,$r=null;qi&&"documentMode"in document&&($r=document.documentMode);var Nv=qi&&"TextEvent"in window&&!$r,Ap=qi&&(!Tu||$r&&8<$r&&11>=$r),Rp=" ",Cp=!1;function wp(e,i){switch(e){case"keyup":return Lv.indexOf(i.keyCode)!==-1;case"keydown":return i.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Dp(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var Is=!1;function Ov(e,i){switch(e){case"compositionend":return Dp(i);case"keypress":return i.which!==32?null:(Cp=!0,Rp);case"textInput":return e=i.data,e===Rp&&Cp?null:e;default:return null}}function Pv(e,i){if(Is)return e==="compositionend"||!Tu&&wp(e,i)?(e=Sp(),ul=yu=ba=null,Is=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(i.ctrlKey||i.altKey||i.metaKey)||i.ctrlKey&&i.altKey){if(i.char&&1<i.char.length)return i.char;if(i.which)return String.fromCharCode(i.which)}return null;case"compositionend":return Ap&&i.locale!=="ko"?null:i.data;default:return null}}var zv={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Up(e){var i=e&&e.nodeName&&e.nodeName.toLowerCase();return i==="input"?!!zv[e.type]:i==="textarea"}function Lp(e,i,a,o){Bs?Fs?Fs.push(o):Fs=[o]:Bs=o,i=ic(i,"onChange"),0<i.length&&(a=new dl("onChange","change",null,a,o),e.push({event:a,listeners:i}))}var to=null,eo=null;function Bv(e){px(e,0)}function ml(e){var i=X(e);if(Re(i))return e}function Np(e,i){if(e==="change")return i}var Op=!1;if(qi){var Au;if(qi){var Ru="oninput"in document;if(!Ru){var Pp=document.createElement("div");Pp.setAttribute("oninput","return;"),Ru=typeof Pp.oninput=="function"}Au=Ru}else Au=!1;Op=Au&&(!document.documentMode||9<document.documentMode)}function zp(){to&&(to.detachEvent("onpropertychange",Bp),eo=to=null)}function Bp(e){if(e.propertyName==="value"&&ml(eo)){var i=[];Lp(i,eo,e,gu(e)),yp(Bv,i)}}function Fv(e,i,a){e==="focusin"?(zp(),to=i,eo=a,to.attachEvent("onpropertychange",Bp)):e==="focusout"&&zp()}function Iv(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return ml(eo)}function Hv(e,i){if(e==="click")return ml(i)}function Gv(e,i){if(e==="input"||e==="change")return ml(i)}function Vv(e,i){return e===i&&(e!==0||1/e===1/i)||e!==e&&i!==i}var Jn=typeof Object.is=="function"?Object.is:Vv;function no(e,i){if(Jn(e,i))return!0;if(typeof e!="object"||e===null||typeof i!="object"||i===null)return!1;var a=Object.keys(e),o=Object.keys(i);if(a.length!==o.length)return!1;for(o=0;o<a.length;o++){var u=a[o];if(!Tt.call(i,u)||!Jn(e[u],i[u]))return!1}return!0}function Fp(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function Ip(e,i){var a=Fp(e);e=0;for(var o;a;){if(a.nodeType===3){if(o=e+a.textContent.length,e<=i&&o>=i)return{node:a,offset:i-e};e=o}t:{for(;a;){if(a.nextSibling){a=a.nextSibling;break t}a=a.parentNode}a=void 0}a=Fp(a)}}function Hp(e,i){return e&&i?e===i?!0:e&&e.nodeType===3?!1:i&&i.nodeType===3?Hp(e,i.parentNode):"contains"in e?e.contains(i):e.compareDocumentPosition?!!(e.compareDocumentPosition(i)&16):!1:!1}function Gp(e){e=e!=null&&e.ownerDocument!=null&&e.ownerDocument.defaultView!=null?e.ownerDocument.defaultView:window;for(var i=yn(e.document);i instanceof e.HTMLIFrameElement;){try{var a=typeof i.contentWindow.location.href=="string"}catch{a=!1}if(a)e=i.contentWindow;else break;i=yn(e.document)}return i}function Cu(e){var i=e&&e.nodeName&&e.nodeName.toLowerCase();return i&&(i==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||i==="textarea"||e.contentEditable==="true")}var kv=qi&&"documentMode"in document&&11>=document.documentMode,Hs=null,wu=null,io=null,Du=!1;function Vp(e,i,a){var o=a.window===a?a.document:a.nodeType===9?a:a.ownerDocument;Du||Hs==null||Hs!==yn(o)||(o=Hs,"selectionStart"in o&&Cu(o)?o={start:o.selectionStart,end:o.selectionEnd}:(o=(o.ownerDocument&&o.ownerDocument.defaultView||window).getSelection(),o={anchorNode:o.anchorNode,anchorOffset:o.anchorOffset,focusNode:o.focusNode,focusOffset:o.focusOffset}),io&&no(io,o)||(io=o,o=ic(wu,"onSelect"),0<o.length&&(i=new dl("onSelect","select",null,i,a),e.push({event:i,listeners:o}),i.target=Hs)))}function os(e,i){var a={};return a[e.toLowerCase()]=i.toLowerCase(),a["Webkit"+e]="webkit"+i,a["Moz"+e]="moz"+i,a}var Gs={animationend:os("Animation","AnimationEnd"),animationiteration:os("Animation","AnimationIteration"),animationstart:os("Animation","AnimationStart"),transitionrun:os("Transition","TransitionRun"),transitionstart:os("Transition","TransitionStart"),transitioncancel:os("Transition","TransitionCancel"),transitionend:os("Transition","TransitionEnd")},Uu={},kp={};qi&&(kp=document.createElement("div").style,"AnimationEvent"in window||(delete Gs.animationend.animation,delete Gs.animationiteration.animation,delete Gs.animationstart.animation),"TransitionEvent"in window||delete Gs.transitionend.transition);function ls(e){if(Uu[e])return Uu[e];if(!Gs[e])return e;var i=Gs[e],a;for(a in i)if(i.hasOwnProperty(a)&&a in kp)return Uu[e]=i[a];return e}var Xp=ls("animationend"),Wp=ls("animationiteration"),qp=ls("animationstart"),Xv=ls("transitionrun"),Wv=ls("transitionstart"),qv=ls("transitioncancel"),Yp=ls("transitionend"),jp=new Map,Lu="abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");Lu.push("scrollEnd");function Mi(e,i){jp.set(e,i),Ft(i,[e])}var xl=typeof reportError=="function"?reportError:function(e){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var i=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof e=="object"&&e!==null&&typeof e.message=="string"?String(e.message):String(e),error:e});if(!window.dispatchEvent(i))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",e);return}console.error(e)},li=[],Vs=0,Nu=0;function gl(){for(var e=Vs,i=Nu=Vs=0;i<e;){var a=li[i];li[i++]=null;var o=li[i];li[i++]=null;var u=li[i];li[i++]=null;var h=li[i];if(li[i++]=null,o!==null&&u!==null){var v=o.pending;v===null?u.next=u:(u.next=v.next,v.next=u),o.pending=u}h!==0&&Zp(a,u,h)}}function _l(e,i,a,o){li[Vs++]=e,li[Vs++]=i,li[Vs++]=a,li[Vs++]=o,Nu|=o,e.lanes|=o,e=e.alternate,e!==null&&(e.lanes|=o)}function Ou(e,i,a,o){return _l(e,i,a,o),vl(e)}function cs(e,i){return _l(e,null,null,i),vl(e)}function Zp(e,i,a){e.lanes|=a;var o=e.alternate;o!==null&&(o.lanes|=a);for(var u=!1,h=e.return;h!==null;)h.childLanes|=a,o=h.alternate,o!==null&&(o.childLanes|=a),h.tag===22&&(e=h.stateNode,e===null||e._visibility&1||(u=!0)),e=h,h=h.return;return e.tag===3?(h=e.stateNode,u&&i!==null&&(u=31-Kt(a),e=h.hiddenUpdates,o=e[u],o===null?e[u]=[i]:o.push(i),i.lane=a|536870912),h):null}function vl(e){if(50<Ao)throw Ao=0,Xf=null,Error(s(185));for(var i=e.return;i!==null;)e=i,i=e.return;return e.tag===3?e.stateNode:null}var ks={};function Yv(e,i,a,o){this.tag=e,this.key=a,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.refCleanup=this.ref=null,this.pendingProps=i,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=o,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function $n(e,i,a,o){return new Yv(e,i,a,o)}function Pu(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Yi(e,i){var a=e.alternate;return a===null?(a=$n(e.tag,i,e.key,e.mode),a.elementType=e.elementType,a.type=e.type,a.stateNode=e.stateNode,a.alternate=e,e.alternate=a):(a.pendingProps=i,a.type=e.type,a.flags=0,a.subtreeFlags=0,a.deletions=null),a.flags=e.flags&65011712,a.childLanes=e.childLanes,a.lanes=e.lanes,a.child=e.child,a.memoizedProps=e.memoizedProps,a.memoizedState=e.memoizedState,a.updateQueue=e.updateQueue,i=e.dependencies,a.dependencies=i===null?null:{lanes:i.lanes,firstContext:i.firstContext},a.sibling=e.sibling,a.index=e.index,a.ref=e.ref,a.refCleanup=e.refCleanup,a}function Kp(e,i){e.flags&=65011714;var a=e.alternate;return a===null?(e.childLanes=0,e.lanes=i,e.child=null,e.subtreeFlags=0,e.memoizedProps=null,e.memoizedState=null,e.updateQueue=null,e.dependencies=null,e.stateNode=null):(e.childLanes=a.childLanes,e.lanes=a.lanes,e.child=a.child,e.subtreeFlags=0,e.deletions=null,e.memoizedProps=a.memoizedProps,e.memoizedState=a.memoizedState,e.updateQueue=a.updateQueue,e.type=a.type,i=a.dependencies,e.dependencies=i===null?null:{lanes:i.lanes,firstContext:i.firstContext}),e}function yl(e,i,a,o,u,h){var v=0;if(o=e,typeof e=="function")Pu(e)&&(v=1);else if(typeof e=="string")v=Jy(e,a,Rt.current)?26:e==="html"||e==="head"||e==="body"?27:5;else t:switch(e){case D:return e=$n(31,a,i,u),e.elementType=D,e.lanes=h,e;case A:return us(a.children,u,h,i);case M:v=8,u|=24;break;case y:return e=$n(12,a,i,u|2),e.elementType=y,e.lanes=h,e;case k:return e=$n(13,a,i,u),e.elementType=k,e.lanes=h,e;case P:return e=$n(19,a,i,u),e.elementType=P,e.lanes=h,e;default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case w:v=10;break t;case z:v=9;break t;case O:v=11;break t;case F:v=14;break t;case Q:v=16,o=null;break t}v=29,a=Error(s(130,e===null?"null":typeof e,"")),o=null}return i=$n(v,a,i,u),i.elementType=e,i.type=o,i.lanes=h,i}function us(e,i,a,o){return e=$n(7,e,o,i),e.lanes=a,e}function zu(e,i,a){return e=$n(6,e,null,i),e.lanes=a,e}function Qp(e){var i=$n(18,null,null,0);return i.stateNode=e,i}function Bu(e,i,a){return i=$n(4,e.children!==null?e.children:[],e.key,i),i.lanes=a,i.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},i}var Jp=new WeakMap;function ci(e,i){if(typeof e=="object"&&e!==null){var a=Jp.get(e);return a!==void 0?a:(i={value:e,source:i,stack:Dt(i)},Jp.set(e,i),i)}return{value:e,source:i,stack:Dt(i)}}var Xs=[],Ws=0,Sl=null,ao=0,ui=[],fi=0,Ea=null,Di=1,Ui="";function ji(e,i){Xs[Ws++]=ao,Xs[Ws++]=Sl,Sl=e,ao=i}function $p(e,i,a){ui[fi++]=Di,ui[fi++]=Ui,ui[fi++]=Ea,Ea=e;var o=Di;e=Ui;var u=32-Kt(o)-1;o&=~(1<<u),a+=1;var h=32-Kt(i)+u;if(30<h){var v=u-u%5;h=(o&(1<<v)-1).toString(32),o>>=v,u-=v,Di=1<<32-Kt(i)+u|a<<u|o,Ui=h+e}else Di=1<<h|a<<u|o,Ui=e}function Fu(e){e.return!==null&&(ji(e,1),$p(e,1,0))}function Iu(e){for(;e===Sl;)Sl=Xs[--Ws],Xs[Ws]=null,ao=Xs[--Ws],Xs[Ws]=null;for(;e===Ea;)Ea=ui[--fi],ui[fi]=null,Ui=ui[--fi],ui[fi]=null,Di=ui[--fi],ui[fi]=null}function t0(e,i){ui[fi++]=Di,ui[fi++]=Ui,ui[fi++]=Ea,Di=i.id,Ui=i.overflow,Ea=e}var Rn=null,Ke=null,Ce=!1,Ta=null,hi=!1,Hu=Error(s(519));function Aa(e){var i=Error(s(418,1<arguments.length&&arguments[1]!==void 0&&arguments[1]?"text":"HTML",""));throw so(ci(i,e)),Hu}function e0(e){var i=e.stateNode,a=e.type,o=e.memoizedProps;switch(i[ln]=e,i[pn]=o,a){case"dialog":Me("cancel",i),Me("close",i);break;case"iframe":case"object":case"embed":Me("load",i);break;case"video":case"audio":for(a=0;a<Co.length;a++)Me(Co[a],i);break;case"source":Me("error",i);break;case"img":case"image":case"link":Me("error",i),Me("load",i);break;case"details":Me("toggle",i);break;case"input":Me("invalid",i),Ze(i,o.value,o.defaultValue,o.checked,o.defaultChecked,o.type,o.name,!0);break;case"select":Me("invalid",i);break;case"textarea":Me("invalid",i),An(i,o.value,o.defaultValue,o.children)}a=o.children,typeof a!="string"&&typeof a!="number"&&typeof a!="bigint"||i.textContent===""+a||o.suppressHydrationWarning===!0||_x(i.textContent,a)?(o.popover!=null&&(Me("beforetoggle",i),Me("toggle",i)),o.onScroll!=null&&Me("scroll",i),o.onScrollEnd!=null&&Me("scrollend",i),o.onClick!=null&&(i.onclick=Wi),i=!0):i=!1,i||Aa(e,!0)}function n0(e){for(Rn=e.return;Rn;)switch(Rn.tag){case 5:case 31:case 13:hi=!1;return;case 27:case 3:hi=!0;return;default:Rn=Rn.return}}function qs(e){if(e!==Rn)return!1;if(!Ce)return n0(e),Ce=!0,!1;var i=e.tag,a;if((a=i!==3&&i!==27)&&((a=i===5)&&(a=e.type,a=!(a!=="form"&&a!=="button")||sh(e.type,e.memoizedProps)),a=!a),a&&Ke&&Aa(e),n0(e),i===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(s(317));Ke=Rx(e)}else if(i===31){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(s(317));Ke=Rx(e)}else i===27?(i=Ke,Ha(e.type)?(e=uh,uh=null,Ke=e):Ke=i):Ke=Rn?pi(e.stateNode.nextSibling):null;return!0}function fs(){Ke=Rn=null,Ce=!1}function Gu(){var e=Ta;return e!==null&&(Xn===null?Xn=e:Xn.push.apply(Xn,e),Ta=null),e}function so(e){Ta===null?Ta=[e]:Ta.push(e)}var Vu=N(null),hs=null,Zi=null;function Ra(e,i,a){_t(Vu,i._currentValue),i._currentValue=a}function Ki(e){e._currentValue=Vu.current,it(Vu)}function ku(e,i,a){for(;e!==null;){var o=e.alternate;if((e.childLanes&i)!==i?(e.childLanes|=i,o!==null&&(o.childLanes|=i)):o!==null&&(o.childLanes&i)!==i&&(o.childLanes|=i),e===a)break;e=e.return}}function Xu(e,i,a,o){var u=e.child;for(u!==null&&(u.return=e);u!==null;){var h=u.dependencies;if(h!==null){var v=u.child;h=h.firstContext;t:for(;h!==null;){var T=h;h=u;for(var I=0;I<i.length;I++)if(T.context===i[I]){h.lanes|=a,T=h.alternate,T!==null&&(T.lanes|=a),ku(h.return,a,e),o||(v=null);break t}h=T.next}}else if(u.tag===18){if(v=u.return,v===null)throw Error(s(341));v.lanes|=a,h=v.alternate,h!==null&&(h.lanes|=a),ku(v,a,e),v=null}else v=u.child;if(v!==null)v.return=u;else for(v=u;v!==null;){if(v===e){v=null;break}if(u=v.sibling,u!==null){u.return=v.return,v=u;break}v=v.return}u=v}}function Ys(e,i,a,o){e=null;for(var u=i,h=!1;u!==null;){if(!h){if((u.flags&524288)!==0)h=!0;else if((u.flags&262144)!==0)break}if(u.tag===10){var v=u.alternate;if(v===null)throw Error(s(387));if(v=v.memoizedProps,v!==null){var T=u.type;Jn(u.pendingProps.value,v.value)||(e!==null?e.push(T):e=[T])}}else if(u===ut.current){if(v=u.alternate,v===null)throw Error(s(387));v.memoizedState.memoizedState!==u.memoizedState.memoizedState&&(e!==null?e.push(No):e=[No])}u=u.return}e!==null&&Xu(i,e,a,o),i.flags|=262144}function Ml(e){for(e=e.firstContext;e!==null;){if(!Jn(e.context._currentValue,e.memoizedValue))return!0;e=e.next}return!1}function ds(e){hs=e,Zi=null,e=e.dependencies,e!==null&&(e.firstContext=null)}function Cn(e){return i0(hs,e)}function bl(e,i){return hs===null&&ds(e),i0(e,i)}function i0(e,i){var a=i._currentValue;if(i={context:i,memoizedValue:a,next:null},Zi===null){if(e===null)throw Error(s(308));Zi=i,e.dependencies={lanes:0,firstContext:i},e.flags|=524288}else Zi=Zi.next=i;return a}var jv=typeof AbortController<"u"?AbortController:function(){var e=[],i=this.signal={aborted:!1,addEventListener:function(a,o){e.push(o)}};this.abort=function(){i.aborted=!0,e.forEach(function(a){return a()})}},Zv=r.unstable_scheduleCallback,Kv=r.unstable_NormalPriority,cn={$$typeof:w,Consumer:null,Provider:null,_currentValue:null,_currentValue2:null,_threadCount:0};function Wu(){return{controller:new jv,data:new Map,refCount:0}}function ro(e){e.refCount--,e.refCount===0&&Zv(Kv,function(){e.controller.abort()})}var oo=null,qu=0,js=0,Zs=null;function Qv(e,i){if(oo===null){var a=oo=[];qu=0,js=Kf(),Zs={status:"pending",value:void 0,then:function(o){a.push(o)}}}return qu++,i.then(a0,a0),i}function a0(){if(--qu===0&&oo!==null){Zs!==null&&(Zs.status="fulfilled");var e=oo;oo=null,js=0,Zs=null;for(var i=0;i<e.length;i++)(0,e[i])()}}function Jv(e,i){var a=[],o={status:"pending",value:null,reason:null,then:function(u){a.push(u)}};return e.then(function(){o.status="fulfilled",o.value=i;for(var u=0;u<a.length;u++)(0,a[u])(i)},function(u){for(o.status="rejected",o.reason=u,u=0;u<a.length;u++)(0,a[u])(void 0)}),o}var s0=B.S;B.S=function(e,i){Vm=E(),typeof i=="object"&&i!==null&&typeof i.then=="function"&&Qv(e,i),s0!==null&&s0(e,i)};var ps=N(null);function Yu(){var e=ps.current;return e!==null?e:Ye.pooledCache}function El(e,i){i===null?_t(ps,ps.current):_t(ps,i.pool)}function r0(){var e=Yu();return e===null?null:{parent:cn._currentValue,pool:e}}var Ks=Error(s(460)),ju=Error(s(474)),Tl=Error(s(542)),Al={then:function(){}};function o0(e){return e=e.status,e==="fulfilled"||e==="rejected"}function l0(e,i,a){switch(a=e[a],a===void 0?e.push(i):a!==i&&(i.then(Wi,Wi),i=a),i.status){case"fulfilled":return i.value;case"rejected":throw e=i.reason,u0(e),e;default:if(typeof i.status=="string")i.then(Wi,Wi);else{if(e=Ye,e!==null&&100<e.shellSuspendCounter)throw Error(s(482));e=i,e.status="pending",e.then(function(o){if(i.status==="pending"){var u=i;u.status="fulfilled",u.value=o}},function(o){if(i.status==="pending"){var u=i;u.status="rejected",u.reason=o}})}switch(i.status){case"fulfilled":return i.value;case"rejected":throw e=i.reason,u0(e),e}throw xs=i,Ks}}function ms(e){try{var i=e._init;return i(e._payload)}catch(a){throw a!==null&&typeof a=="object"&&typeof a.then=="function"?(xs=a,Ks):a}}var xs=null;function c0(){if(xs===null)throw Error(s(459));var e=xs;return xs=null,e}function u0(e){if(e===Ks||e===Tl)throw Error(s(483))}var Qs=null,lo=0;function Rl(e){var i=lo;return lo+=1,Qs===null&&(Qs=[]),l0(Qs,e,i)}function co(e,i){i=i.props.ref,e.ref=i!==void 0?i:null}function Cl(e,i){throw i.$$typeof===_?Error(s(525)):(e=Object.prototype.toString.call(i),Error(s(31,e==="[object Object]"?"object with keys {"+Object.keys(i).join(", ")+"}":e)))}function f0(e){function i(W,V){if(e){var J=W.deletions;J===null?(W.deletions=[V],W.flags|=16):J.push(V)}}function a(W,V){if(!e)return null;for(;V!==null;)i(W,V),V=V.sibling;return null}function o(W){for(var V=new Map;W!==null;)W.key!==null?V.set(W.key,W):V.set(W.index,W),W=W.sibling;return V}function u(W,V){return W=Yi(W,V),W.index=0,W.sibling=null,W}function h(W,V,J){return W.index=J,e?(J=W.alternate,J!==null?(J=J.index,J<V?(W.flags|=67108866,V):J):(W.flags|=67108866,V)):(W.flags|=1048576,V)}function v(W){return e&&W.alternate===null&&(W.flags|=67108866),W}function T(W,V,J,dt){return V===null||V.tag!==6?(V=zu(J,W.mode,dt),V.return=W,V):(V=u(V,J),V.return=W,V)}function I(W,V,J,dt){var ie=J.type;return ie===A?ht(W,V,J.props.children,dt,J.key):V!==null&&(V.elementType===ie||typeof ie=="object"&&ie!==null&&ie.$$typeof===Q&&ms(ie)===V.type)?(V=u(V,J.props),co(V,J),V.return=W,V):(V=yl(J.type,J.key,J.props,null,W.mode,dt),co(V,J),V.return=W,V)}function $(W,V,J,dt){return V===null||V.tag!==4||V.stateNode.containerInfo!==J.containerInfo||V.stateNode.implementation!==J.implementation?(V=Bu(J,W.mode,dt),V.return=W,V):(V=u(V,J.children||[]),V.return=W,V)}function ht(W,V,J,dt,ie){return V===null||V.tag!==7?(V=us(J,W.mode,dt,ie),V.return=W,V):(V=u(V,J),V.return=W,V)}function mt(W,V,J){if(typeof V=="string"&&V!==""||typeof V=="number"||typeof V=="bigint")return V=zu(""+V,W.mode,J),V.return=W,V;if(typeof V=="object"&&V!==null){switch(V.$$typeof){case S:return J=yl(V.type,V.key,V.props,null,W.mode,J),co(J,V),J.return=W,J;case b:return V=Bu(V,W.mode,J),V.return=W,V;case Q:return V=ms(V),mt(W,V,J)}if(lt(V)||nt(V))return V=us(V,W.mode,J,null),V.return=W,V;if(typeof V.then=="function")return mt(W,Rl(V),J);if(V.$$typeof===w)return mt(W,bl(W,V),J);Cl(W,V)}return null}function et(W,V,J,dt){var ie=V!==null?V.key:null;if(typeof J=="string"&&J!==""||typeof J=="number"||typeof J=="bigint")return ie!==null?null:T(W,V,""+J,dt);if(typeof J=="object"&&J!==null){switch(J.$$typeof){case S:return J.key===ie?I(W,V,J,dt):null;case b:return J.key===ie?$(W,V,J,dt):null;case Q:return J=ms(J),et(W,V,J,dt)}if(lt(J)||nt(J))return ie!==null?null:ht(W,V,J,dt,null);if(typeof J.then=="function")return et(W,V,Rl(J),dt);if(J.$$typeof===w)return et(W,V,bl(W,J),dt);Cl(W,J)}return null}function rt(W,V,J,dt,ie){if(typeof dt=="string"&&dt!==""||typeof dt=="number"||typeof dt=="bigint")return W=W.get(J)||null,T(V,W,""+dt,ie);if(typeof dt=="object"&&dt!==null){switch(dt.$$typeof){case S:return W=W.get(dt.key===null?J:dt.key)||null,I(V,W,dt,ie);case b:return W=W.get(dt.key===null?J:dt.key)||null,$(V,W,dt,ie);case Q:return dt=ms(dt),rt(W,V,J,dt,ie)}if(lt(dt)||nt(dt))return W=W.get(J)||null,ht(V,W,dt,ie,null);if(typeof dt.then=="function")return rt(W,V,J,Rl(dt),ie);if(dt.$$typeof===w)return rt(W,V,J,bl(V,dt),ie);Cl(V,dt)}return null}function jt(W,V,J,dt){for(var ie=null,Le=null,Jt=V,ge=V=0,Ee=null;Jt!==null&&ge<J.length;ge++){Jt.index>ge?(Ee=Jt,Jt=null):Ee=Jt.sibling;var Ne=et(W,Jt,J[ge],dt);if(Ne===null){Jt===null&&(Jt=Ee);break}e&&Jt&&Ne.alternate===null&&i(W,Jt),V=h(Ne,V,ge),Le===null?ie=Ne:Le.sibling=Ne,Le=Ne,Jt=Ee}if(ge===J.length)return a(W,Jt),Ce&&ji(W,ge),ie;if(Jt===null){for(;ge<J.length;ge++)Jt=mt(W,J[ge],dt),Jt!==null&&(V=h(Jt,V,ge),Le===null?ie=Jt:Le.sibling=Jt,Le=Jt);return Ce&&ji(W,ge),ie}for(Jt=o(Jt);ge<J.length;ge++)Ee=rt(Jt,W,ge,J[ge],dt),Ee!==null&&(e&&Ee.alternate!==null&&Jt.delete(Ee.key===null?ge:Ee.key),V=h(Ee,V,ge),Le===null?ie=Ee:Le.sibling=Ee,Le=Ee);return e&&Jt.forEach(function(Wa){return i(W,Wa)}),Ce&&ji(W,ge),ie}function re(W,V,J,dt){if(J==null)throw Error(s(151));for(var ie=null,Le=null,Jt=V,ge=V=0,Ee=null,Ne=J.next();Jt!==null&&!Ne.done;ge++,Ne=J.next()){Jt.index>ge?(Ee=Jt,Jt=null):Ee=Jt.sibling;var Wa=et(W,Jt,Ne.value,dt);if(Wa===null){Jt===null&&(Jt=Ee);break}e&&Jt&&Wa.alternate===null&&i(W,Jt),V=h(Wa,V,ge),Le===null?ie=Wa:Le.sibling=Wa,Le=Wa,Jt=Ee}if(Ne.done)return a(W,Jt),Ce&&ji(W,ge),ie;if(Jt===null){for(;!Ne.done;ge++,Ne=J.next())Ne=mt(W,Ne.value,dt),Ne!==null&&(V=h(Ne,V,ge),Le===null?ie=Ne:Le.sibling=Ne,Le=Ne);return Ce&&ji(W,ge),ie}for(Jt=o(Jt);!Ne.done;ge++,Ne=J.next())Ne=rt(Jt,W,ge,Ne.value,dt),Ne!==null&&(e&&Ne.alternate!==null&&Jt.delete(Ne.key===null?ge:Ne.key),V=h(Ne,V,ge),Le===null?ie=Ne:Le.sibling=Ne,Le=Ne);return e&&Jt.forEach(function(cS){return i(W,cS)}),Ce&&ji(W,ge),ie}function ke(W,V,J,dt){if(typeof J=="object"&&J!==null&&J.type===A&&J.key===null&&(J=J.props.children),typeof J=="object"&&J!==null){switch(J.$$typeof){case S:t:{for(var ie=J.key;V!==null;){if(V.key===ie){if(ie=J.type,ie===A){if(V.tag===7){a(W,V.sibling),dt=u(V,J.props.children),dt.return=W,W=dt;break t}}else if(V.elementType===ie||typeof ie=="object"&&ie!==null&&ie.$$typeof===Q&&ms(ie)===V.type){a(W,V.sibling),dt=u(V,J.props),co(dt,J),dt.return=W,W=dt;break t}a(W,V);break}else i(W,V);V=V.sibling}J.type===A?(dt=us(J.props.children,W.mode,dt,J.key),dt.return=W,W=dt):(dt=yl(J.type,J.key,J.props,null,W.mode,dt),co(dt,J),dt.return=W,W=dt)}return v(W);case b:t:{for(ie=J.key;V!==null;){if(V.key===ie)if(V.tag===4&&V.stateNode.containerInfo===J.containerInfo&&V.stateNode.implementation===J.implementation){a(W,V.sibling),dt=u(V,J.children||[]),dt.return=W,W=dt;break t}else{a(W,V);break}else i(W,V);V=V.sibling}dt=Bu(J,W.mode,dt),dt.return=W,W=dt}return v(W);case Q:return J=ms(J),ke(W,V,J,dt)}if(lt(J))return jt(W,V,J,dt);if(nt(J)){if(ie=nt(J),typeof ie!="function")throw Error(s(150));return J=ie.call(J),re(W,V,J,dt)}if(typeof J.then=="function")return ke(W,V,Rl(J),dt);if(J.$$typeof===w)return ke(W,V,bl(W,J),dt);Cl(W,J)}return typeof J=="string"&&J!==""||typeof J=="number"||typeof J=="bigint"?(J=""+J,V!==null&&V.tag===6?(a(W,V.sibling),dt=u(V,J),dt.return=W,W=dt):(a(W,V),dt=zu(J,W.mode,dt),dt.return=W,W=dt),v(W)):a(W,V)}return function(W,V,J,dt){try{lo=0;var ie=ke(W,V,J,dt);return Qs=null,ie}catch(Jt){if(Jt===Ks||Jt===Tl)throw Jt;var Le=$n(29,Jt,null,W.mode);return Le.lanes=dt,Le.return=W,Le}}}var gs=f0(!0),h0=f0(!1),Ca=!1;function Zu(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,lanes:0,hiddenCallbacks:null},callbacks:null}}function Ku(e,i){e=e.updateQueue,i.updateQueue===e&&(i.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,callbacks:null})}function wa(e){return{lane:e,tag:0,payload:null,callback:null,next:null}}function Da(e,i,a){var o=e.updateQueue;if(o===null)return null;if(o=o.shared,(ze&2)!==0){var u=o.pending;return u===null?i.next=i:(i.next=u.next,u.next=i),o.pending=i,i=vl(e),Zp(e,null,a),i}return _l(e,o,i,a),vl(e)}function uo(e,i,a){if(i=i.updateQueue,i!==null&&(i=i.shared,(a&4194048)!==0)){var o=i.lanes;o&=e.pendingLanes,a|=o,i.lanes=a,Xr(e,a)}}function Qu(e,i){var a=e.updateQueue,o=e.alternate;if(o!==null&&(o=o.updateQueue,a===o)){var u=null,h=null;if(a=a.firstBaseUpdate,a!==null){do{var v={lane:a.lane,tag:a.tag,payload:a.payload,callback:null,next:null};h===null?u=h=v:h=h.next=v,a=a.next}while(a!==null);h===null?u=h=i:h=h.next=i}else u=h=i;a={baseState:o.baseState,firstBaseUpdate:u,lastBaseUpdate:h,shared:o.shared,callbacks:o.callbacks},e.updateQueue=a;return}e=a.lastBaseUpdate,e===null?a.firstBaseUpdate=i:e.next=i,a.lastBaseUpdate=i}var Ju=!1;function fo(){if(Ju){var e=Zs;if(e!==null)throw e}}function ho(e,i,a,o){Ju=!1;var u=e.updateQueue;Ca=!1;var h=u.firstBaseUpdate,v=u.lastBaseUpdate,T=u.shared.pending;if(T!==null){u.shared.pending=null;var I=T,$=I.next;I.next=null,v===null?h=$:v.next=$,v=I;var ht=e.alternate;ht!==null&&(ht=ht.updateQueue,T=ht.lastBaseUpdate,T!==v&&(T===null?ht.firstBaseUpdate=$:T.next=$,ht.lastBaseUpdate=I))}if(h!==null){var mt=u.baseState;v=0,ht=$=I=null,T=h;do{var et=T.lane&-536870913,rt=et!==T.lane;if(rt?(be&et)===et:(o&et)===et){et!==0&&et===js&&(Ju=!0),ht!==null&&(ht=ht.next={lane:0,tag:T.tag,payload:T.payload,callback:null,next:null});t:{var jt=e,re=T;et=i;var ke=a;switch(re.tag){case 1:if(jt=re.payload,typeof jt=="function"){mt=jt.call(ke,mt,et);break t}mt=jt;break t;case 3:jt.flags=jt.flags&-65537|128;case 0:if(jt=re.payload,et=typeof jt=="function"?jt.call(ke,mt,et):jt,et==null)break t;mt=g({},mt,et);break t;case 2:Ca=!0}}et=T.callback,et!==null&&(e.flags|=64,rt&&(e.flags|=8192),rt=u.callbacks,rt===null?u.callbacks=[et]:rt.push(et))}else rt={lane:et,tag:T.tag,payload:T.payload,callback:T.callback,next:null},ht===null?($=ht=rt,I=mt):ht=ht.next=rt,v|=et;if(T=T.next,T===null){if(T=u.shared.pending,T===null)break;rt=T,T=rt.next,rt.next=null,u.lastBaseUpdate=rt,u.shared.pending=null}}while(!0);ht===null&&(I=mt),u.baseState=I,u.firstBaseUpdate=$,u.lastBaseUpdate=ht,h===null&&(u.shared.lanes=0),Pa|=v,e.lanes=v,e.memoizedState=mt}}function d0(e,i){if(typeof e!="function")throw Error(s(191,e));e.call(i)}function p0(e,i){var a=e.callbacks;if(a!==null)for(e.callbacks=null,e=0;e<a.length;e++)d0(a[e],i)}var Js=N(null),wl=N(0);function m0(e,i){e=sa,_t(wl,e),_t(Js,i),sa=e|i.baseLanes}function $u(){_t(wl,sa),_t(Js,Js.current)}function tf(){sa=wl.current,it(Js),it(wl)}var ti=N(null),di=null;function Ua(e){var i=e.alternate;_t(rn,rn.current&1),_t(ti,e),di===null&&(i===null||Js.current!==null||i.memoizedState!==null)&&(di=e)}function ef(e){_t(rn,rn.current),_t(ti,e),di===null&&(di=e)}function x0(e){e.tag===22?(_t(rn,rn.current),_t(ti,e),di===null&&(di=e)):La()}function La(){_t(rn,rn.current),_t(ti,ti.current)}function ei(e){it(ti),di===e&&(di=null),it(rn)}var rn=N(0);function Dl(e){for(var i=e;i!==null;){if(i.tag===13){var a=i.memoizedState;if(a!==null&&(a=a.dehydrated,a===null||lh(a)||ch(a)))return i}else if(i.tag===19&&(i.memoizedProps.revealOrder==="forwards"||i.memoizedProps.revealOrder==="backwards"||i.memoizedProps.revealOrder==="unstable_legacy-backwards"||i.memoizedProps.revealOrder==="together")){if((i.flags&128)!==0)return i}else if(i.child!==null){i.child.return=i,i=i.child;continue}if(i===e)break;for(;i.sibling===null;){if(i.return===null||i.return===e)return null;i=i.return}i.sibling.return=i.return,i=i.sibling}return null}var Qi=0,me=null,Ge=null,un=null,Ul=!1,$s=!1,_s=!1,Ll=0,po=0,tr=null,$v=0;function en(){throw Error(s(321))}function nf(e,i){if(i===null)return!1;for(var a=0;a<i.length&&a<e.length;a++)if(!Jn(e[a],i[a]))return!1;return!0}function af(e,i,a,o,u,h){return Qi=h,me=i,i.memoizedState=null,i.updateQueue=null,i.lanes=0,B.H=e===null||e.memoizedState===null?$0:vf,_s=!1,h=a(o,u),_s=!1,$s&&(h=_0(i,a,o,u)),g0(e),h}function g0(e){B.H=go;var i=Ge!==null&&Ge.next!==null;if(Qi=0,un=Ge=me=null,Ul=!1,po=0,tr=null,i)throw Error(s(300));e===null||fn||(e=e.dependencies,e!==null&&Ml(e)&&(fn=!0))}function _0(e,i,a,o){me=e;var u=0;do{if($s&&(tr=null),po=0,$s=!1,25<=u)throw Error(s(301));if(u+=1,un=Ge=null,e.updateQueue!=null){var h=e.updateQueue;h.lastEffect=null,h.events=null,h.stores=null,h.memoCache!=null&&(h.memoCache.index=0)}B.H=tm,h=i(a,o)}while($s);return h}function ty(){var e=B.H,i=e.useState()[0];return i=typeof i.then=="function"?mo(i):i,e=e.useState()[0],(Ge!==null?Ge.memoizedState:null)!==e&&(me.flags|=1024),i}function sf(){var e=Ll!==0;return Ll=0,e}function rf(e,i,a){i.updateQueue=e.updateQueue,i.flags&=-2053,e.lanes&=~a}function of(e){if(Ul){for(e=e.memoizedState;e!==null;){var i=e.queue;i!==null&&(i.pending=null),e=e.next}Ul=!1}Qi=0,un=Ge=me=null,$s=!1,po=Ll=0,tr=null}function Bn(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return un===null?me.memoizedState=un=e:un=un.next=e,un}function on(){if(Ge===null){var e=me.alternate;e=e!==null?e.memoizedState:null}else e=Ge.next;var i=un===null?me.memoizedState:un.next;if(i!==null)un=i,Ge=e;else{if(e===null)throw me.alternate===null?Error(s(467)):Error(s(310));Ge=e,e={memoizedState:Ge.memoizedState,baseState:Ge.baseState,baseQueue:Ge.baseQueue,queue:Ge.queue,next:null},un===null?me.memoizedState=un=e:un=un.next=e}return un}function Nl(){return{lastEffect:null,events:null,stores:null,memoCache:null}}function mo(e){var i=po;return po+=1,tr===null&&(tr=[]),e=l0(tr,e,i),i=me,(un===null?i.memoizedState:un.next)===null&&(i=i.alternate,B.H=i===null||i.memoizedState===null?$0:vf),e}function Ol(e){if(e!==null&&typeof e=="object"){if(typeof e.then=="function")return mo(e);if(e.$$typeof===w)return Cn(e)}throw Error(s(438,String(e)))}function lf(e){var i=null,a=me.updateQueue;if(a!==null&&(i=a.memoCache),i==null){var o=me.alternate;o!==null&&(o=o.updateQueue,o!==null&&(o=o.memoCache,o!=null&&(i={data:o.data.map(function(u){return u.slice()}),index:0})))}if(i==null&&(i={data:[],index:0}),a===null&&(a=Nl(),me.updateQueue=a),a.memoCache=i,a=i.data[i.index],a===void 0)for(a=i.data[i.index]=Array(e),o=0;o<e;o++)a[o]=C;return i.index++,a}function Ji(e,i){return typeof i=="function"?i(e):i}function Pl(e){var i=on();return cf(i,Ge,e)}function cf(e,i,a){var o=e.queue;if(o===null)throw Error(s(311));o.lastRenderedReducer=a;var u=e.baseQueue,h=o.pending;if(h!==null){if(u!==null){var v=u.next;u.next=h.next,h.next=v}i.baseQueue=u=h,o.pending=null}if(h=e.baseState,u===null)e.memoizedState=h;else{i=u.next;var T=v=null,I=null,$=i,ht=!1;do{var mt=$.lane&-536870913;if(mt!==$.lane?(be&mt)===mt:(Qi&mt)===mt){var et=$.revertLane;if(et===0)I!==null&&(I=I.next={lane:0,revertLane:0,gesture:null,action:$.action,hasEagerState:$.hasEagerState,eagerState:$.eagerState,next:null}),mt===js&&(ht=!0);else if((Qi&et)===et){$=$.next,et===js&&(ht=!0);continue}else mt={lane:0,revertLane:$.revertLane,gesture:null,action:$.action,hasEagerState:$.hasEagerState,eagerState:$.eagerState,next:null},I===null?(T=I=mt,v=h):I=I.next=mt,me.lanes|=et,Pa|=et;mt=$.action,_s&&a(h,mt),h=$.hasEagerState?$.eagerState:a(h,mt)}else et={lane:mt,revertLane:$.revertLane,gesture:$.gesture,action:$.action,hasEagerState:$.hasEagerState,eagerState:$.eagerState,next:null},I===null?(T=I=et,v=h):I=I.next=et,me.lanes|=mt,Pa|=mt;$=$.next}while($!==null&&$!==i);if(I===null?v=h:I.next=T,!Jn(h,e.memoizedState)&&(fn=!0,ht&&(a=Zs,a!==null)))throw a;e.memoizedState=h,e.baseState=v,e.baseQueue=I,o.lastRenderedState=h}return u===null&&(o.lanes=0),[e.memoizedState,o.dispatch]}function uf(e){var i=on(),a=i.queue;if(a===null)throw Error(s(311));a.lastRenderedReducer=e;var o=a.dispatch,u=a.pending,h=i.memoizedState;if(u!==null){a.pending=null;var v=u=u.next;do h=e(h,v.action),v=v.next;while(v!==u);Jn(h,i.memoizedState)||(fn=!0),i.memoizedState=h,i.baseQueue===null&&(i.baseState=h),a.lastRenderedState=h}return[h,o]}function v0(e,i,a){var o=me,u=on(),h=Ce;if(h){if(a===void 0)throw Error(s(407));a=a()}else a=i();var v=!Jn((Ge||u).memoizedState,a);if(v&&(u.memoizedState=a,fn=!0),u=u.queue,df(M0.bind(null,o,u,e),[e]),u.getSnapshot!==i||v||un!==null&&un.memoizedState.tag&1){if(o.flags|=2048,er(9,{destroy:void 0},S0.bind(null,o,u,a,i),null),Ye===null)throw Error(s(349));h||(Qi&127)!==0||y0(o,i,a)}return a}function y0(e,i,a){e.flags|=16384,e={getSnapshot:i,value:a},i=me.updateQueue,i===null?(i=Nl(),me.updateQueue=i,i.stores=[e]):(a=i.stores,a===null?i.stores=[e]:a.push(e))}function S0(e,i,a,o){i.value=a,i.getSnapshot=o,b0(i)&&E0(e)}function M0(e,i,a){return a(function(){b0(i)&&E0(e)})}function b0(e){var i=e.getSnapshot;e=e.value;try{var a=i();return!Jn(e,a)}catch{return!0}}function E0(e){var i=cs(e,2);i!==null&&Wn(i,e,2)}function ff(e){var i=Bn();if(typeof e=="function"){var a=e;if(e=a(),_s){te(!0);try{a()}finally{te(!1)}}}return i.memoizedState=i.baseState=e,i.queue={pending:null,lanes:0,dispatch:null,lastRenderedReducer:Ji,lastRenderedState:e},i}function T0(e,i,a,o){return e.baseState=a,cf(e,Ge,typeof o=="function"?o:Ji)}function ey(e,i,a,o,u){if(Fl(e))throw Error(s(485));if(e=i.action,e!==null){var h={payload:u,action:e,next:null,isTransition:!0,status:"pending",value:null,reason:null,listeners:[],then:function(v){h.listeners.push(v)}};B.T!==null?a(!0):h.isTransition=!1,o(h),a=i.pending,a===null?(h.next=i.pending=h,A0(i,h)):(h.next=a.next,i.pending=a.next=h)}}function A0(e,i){var a=i.action,o=i.payload,u=e.state;if(i.isTransition){var h=B.T,v={};B.T=v;try{var T=a(u,o),I=B.S;I!==null&&I(v,T),R0(e,i,T)}catch($){hf(e,i,$)}finally{h!==null&&v.types!==null&&(h.types=v.types),B.T=h}}else try{h=a(u,o),R0(e,i,h)}catch($){hf(e,i,$)}}function R0(e,i,a){a!==null&&typeof a=="object"&&typeof a.then=="function"?a.then(function(o){C0(e,i,o)},function(o){return hf(e,i,o)}):C0(e,i,a)}function C0(e,i,a){i.status="fulfilled",i.value=a,w0(i),e.state=a,i=e.pending,i!==null&&(a=i.next,a===i?e.pending=null:(a=a.next,i.next=a,A0(e,a)))}function hf(e,i,a){var o=e.pending;if(e.pending=null,o!==null){o=o.next;do i.status="rejected",i.reason=a,w0(i),i=i.next;while(i!==o)}e.action=null}function w0(e){e=e.listeners;for(var i=0;i<e.length;i++)(0,e[i])()}function D0(e,i){return i}function U0(e,i){if(Ce){var a=Ye.formState;if(a!==null){t:{var o=me;if(Ce){if(Ke){e:{for(var u=Ke,h=hi;u.nodeType!==8;){if(!h){u=null;break e}if(u=pi(u.nextSibling),u===null){u=null;break e}}h=u.data,u=h==="F!"||h==="F"?u:null}if(u){Ke=pi(u.nextSibling),o=u.data==="F!";break t}}Aa(o)}o=!1}o&&(i=a[0])}}return a=Bn(),a.memoizedState=a.baseState=i,o={pending:null,lanes:0,dispatch:null,lastRenderedReducer:D0,lastRenderedState:i},a.queue=o,a=K0.bind(null,me,o),o.dispatch=a,o=ff(!1),h=_f.bind(null,me,!1,o.queue),o=Bn(),u={state:i,dispatch:null,action:e,pending:null},o.queue=u,a=ey.bind(null,me,u,h,a),u.dispatch=a,o.memoizedState=e,[i,a,!1]}function L0(e){var i=on();return N0(i,Ge,e)}function N0(e,i,a){if(i=cf(e,i,D0)[0],e=Pl(Ji)[0],typeof i=="object"&&i!==null&&typeof i.then=="function")try{var o=mo(i)}catch(v){throw v===Ks?Tl:v}else o=i;i=on();var u=i.queue,h=u.dispatch;return a!==i.memoizedState&&(me.flags|=2048,er(9,{destroy:void 0},ny.bind(null,u,a),null)),[o,h,e]}function ny(e,i){e.action=i}function O0(e){var i=on(),a=Ge;if(a!==null)return N0(i,a,e);on(),i=i.memoizedState,a=on();var o=a.queue.dispatch;return a.memoizedState=e,[i,o,!1]}function er(e,i,a,o){return e={tag:e,create:a,deps:o,inst:i,next:null},i=me.updateQueue,i===null&&(i=Nl(),me.updateQueue=i),a=i.lastEffect,a===null?i.lastEffect=e.next=e:(o=a.next,a.next=e,e.next=o,i.lastEffect=e),e}function P0(){return on().memoizedState}function zl(e,i,a,o){var u=Bn();me.flags|=e,u.memoizedState=er(1|i,{destroy:void 0},a,o===void 0?null:o)}function Bl(e,i,a,o){var u=on();o=o===void 0?null:o;var h=u.memoizedState.inst;Ge!==null&&o!==null&&nf(o,Ge.memoizedState.deps)?u.memoizedState=er(i,h,a,o):(me.flags|=e,u.memoizedState=er(1|i,h,a,o))}function z0(e,i){zl(8390656,8,e,i)}function df(e,i){Bl(2048,8,e,i)}function iy(e){me.flags|=4;var i=me.updateQueue;if(i===null)i=Nl(),me.updateQueue=i,i.events=[e];else{var a=i.events;a===null?i.events=[e]:a.push(e)}}function B0(e){var i=on().memoizedState;return iy({ref:i,nextImpl:e}),function(){if((ze&2)!==0)throw Error(s(440));return i.impl.apply(void 0,arguments)}}function F0(e,i){return Bl(4,2,e,i)}function I0(e,i){return Bl(4,4,e,i)}function H0(e,i){if(typeof i=="function"){e=e();var a=i(e);return function(){typeof a=="function"?a():i(null)}}if(i!=null)return e=e(),i.current=e,function(){i.current=null}}function G0(e,i,a){a=a!=null?a.concat([e]):null,Bl(4,4,H0.bind(null,i,e),a)}function pf(){}function V0(e,i){var a=on();i=i===void 0?null:i;var o=a.memoizedState;return i!==null&&nf(i,o[1])?o[0]:(a.memoizedState=[e,i],e)}function k0(e,i){var a=on();i=i===void 0?null:i;var o=a.memoizedState;if(i!==null&&nf(i,o[1]))return o[0];if(o=e(),_s){te(!0);try{e()}finally{te(!1)}}return a.memoizedState=[o,i],o}function mf(e,i,a){return a===void 0||(Qi&1073741824)!==0&&(be&261930)===0?e.memoizedState=i:(e.memoizedState=a,e=Xm(),me.lanes|=e,Pa|=e,a)}function X0(e,i,a,o){return Jn(a,i)?a:Js.current!==null?(e=mf(e,a,o),Jn(e,i)||(fn=!0),e):(Qi&42)===0||(Qi&1073741824)!==0&&(be&261930)===0?(fn=!0,e.memoizedState=a):(e=Xm(),me.lanes|=e,Pa|=e,i)}function W0(e,i,a,o,u){var h=q.p;q.p=h!==0&&8>h?h:8;var v=B.T,T={};B.T=T,_f(e,!1,i,a);try{var I=u(),$=B.S;if($!==null&&$(T,I),I!==null&&typeof I=="object"&&typeof I.then=="function"){var ht=Jv(I,o);xo(e,i,ht,ai(e))}else xo(e,i,o,ai(e))}catch(mt){xo(e,i,{then:function(){},status:"rejected",reason:mt},ai())}finally{q.p=h,v!==null&&T.types!==null&&(v.types=T.types),B.T=v}}function ay(){}function xf(e,i,a,o){if(e.tag!==5)throw Error(s(476));var u=q0(e).queue;W0(e,u,i,j,a===null?ay:function(){return Y0(e),a(o)})}function q0(e){var i=e.memoizedState;if(i!==null)return i;i={memoizedState:j,baseState:j,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Ji,lastRenderedState:j},next:null};var a={};return i.next={memoizedState:a,baseState:a,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Ji,lastRenderedState:a},next:null},e.memoizedState=i,e=e.alternate,e!==null&&(e.memoizedState=i),i}function Y0(e){var i=q0(e);i.next===null&&(i=e.alternate.memoizedState),xo(e,i.next.queue,{},ai())}function gf(){return Cn(No)}function j0(){return on().memoizedState}function Z0(){return on().memoizedState}function sy(e){for(var i=e.return;i!==null;){switch(i.tag){case 24:case 3:var a=ai();e=wa(a);var o=Da(i,e,a);o!==null&&(Wn(o,i,a),uo(o,i,a)),i={cache:Wu()},e.payload=i;return}i=i.return}}function ry(e,i,a){var o=ai();a={lane:o,revertLane:0,gesture:null,action:a,hasEagerState:!1,eagerState:null,next:null},Fl(e)?Q0(i,a):(a=Ou(e,i,a,o),a!==null&&(Wn(a,e,o),J0(a,i,o)))}function K0(e,i,a){var o=ai();xo(e,i,a,o)}function xo(e,i,a,o){var u={lane:o,revertLane:0,gesture:null,action:a,hasEagerState:!1,eagerState:null,next:null};if(Fl(e))Q0(i,u);else{var h=e.alternate;if(e.lanes===0&&(h===null||h.lanes===0)&&(h=i.lastRenderedReducer,h!==null))try{var v=i.lastRenderedState,T=h(v,a);if(u.hasEagerState=!0,u.eagerState=T,Jn(T,v))return _l(e,i,u,0),Ye===null&&gl(),!1}catch{}if(a=Ou(e,i,u,o),a!==null)return Wn(a,e,o),J0(a,i,o),!0}return!1}function _f(e,i,a,o){if(o={lane:2,revertLane:Kf(),gesture:null,action:o,hasEagerState:!1,eagerState:null,next:null},Fl(e)){if(i)throw Error(s(479))}else i=Ou(e,a,o,2),i!==null&&Wn(i,e,2)}function Fl(e){var i=e.alternate;return e===me||i!==null&&i===me}function Q0(e,i){$s=Ul=!0;var a=e.pending;a===null?i.next=i:(i.next=a.next,a.next=i),e.pending=i}function J0(e,i,a){if((a&4194048)!==0){var o=i.lanes;o&=e.pendingLanes,a|=o,i.lanes=a,Xr(e,a)}}var go={readContext:Cn,use:Ol,useCallback:en,useContext:en,useEffect:en,useImperativeHandle:en,useLayoutEffect:en,useInsertionEffect:en,useMemo:en,useReducer:en,useRef:en,useState:en,useDebugValue:en,useDeferredValue:en,useTransition:en,useSyncExternalStore:en,useId:en,useHostTransitionStatus:en,useFormState:en,useActionState:en,useOptimistic:en,useMemoCache:en,useCacheRefresh:en};go.useEffectEvent=en;var $0={readContext:Cn,use:Ol,useCallback:function(e,i){return Bn().memoizedState=[e,i===void 0?null:i],e},useContext:Cn,useEffect:z0,useImperativeHandle:function(e,i,a){a=a!=null?a.concat([e]):null,zl(4194308,4,H0.bind(null,i,e),a)},useLayoutEffect:function(e,i){return zl(4194308,4,e,i)},useInsertionEffect:function(e,i){zl(4,2,e,i)},useMemo:function(e,i){var a=Bn();i=i===void 0?null:i;var o=e();if(_s){te(!0);try{e()}finally{te(!1)}}return a.memoizedState=[o,i],o},useReducer:function(e,i,a){var o=Bn();if(a!==void 0){var u=a(i);if(_s){te(!0);try{a(i)}finally{te(!1)}}}else u=i;return o.memoizedState=o.baseState=u,e={pending:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:u},o.queue=e,e=e.dispatch=ry.bind(null,me,e),[o.memoizedState,e]},useRef:function(e){var i=Bn();return e={current:e},i.memoizedState=e},useState:function(e){e=ff(e);var i=e.queue,a=K0.bind(null,me,i);return i.dispatch=a,[e.memoizedState,a]},useDebugValue:pf,useDeferredValue:function(e,i){var a=Bn();return mf(a,e,i)},useTransition:function(){var e=ff(!1);return e=W0.bind(null,me,e.queue,!0,!1),Bn().memoizedState=e,[!1,e]},useSyncExternalStore:function(e,i,a){var o=me,u=Bn();if(Ce){if(a===void 0)throw Error(s(407));a=a()}else{if(a=i(),Ye===null)throw Error(s(349));(be&127)!==0||y0(o,i,a)}u.memoizedState=a;var h={value:a,getSnapshot:i};return u.queue=h,z0(M0.bind(null,o,h,e),[e]),o.flags|=2048,er(9,{destroy:void 0},S0.bind(null,o,h,a,i),null),a},useId:function(){var e=Bn(),i=Ye.identifierPrefix;if(Ce){var a=Ui,o=Di;a=(o&~(1<<32-Kt(o)-1)).toString(32)+a,i="_"+i+"R_"+a,a=Ll++,0<a&&(i+="H"+a.toString(32)),i+="_"}else a=$v++,i="_"+i+"r_"+a.toString(32)+"_";return e.memoizedState=i},useHostTransitionStatus:gf,useFormState:U0,useActionState:U0,useOptimistic:function(e){var i=Bn();i.memoizedState=i.baseState=e;var a={pending:null,lanes:0,dispatch:null,lastRenderedReducer:null,lastRenderedState:null};return i.queue=a,i=_f.bind(null,me,!0,a),a.dispatch=i,[e,i]},useMemoCache:lf,useCacheRefresh:function(){return Bn().memoizedState=sy.bind(null,me)},useEffectEvent:function(e){var i=Bn(),a={impl:e};return i.memoizedState=a,function(){if((ze&2)!==0)throw Error(s(440));return a.impl.apply(void 0,arguments)}}},vf={readContext:Cn,use:Ol,useCallback:V0,useContext:Cn,useEffect:df,useImperativeHandle:G0,useInsertionEffect:F0,useLayoutEffect:I0,useMemo:k0,useReducer:Pl,useRef:P0,useState:function(){return Pl(Ji)},useDebugValue:pf,useDeferredValue:function(e,i){var a=on();return X0(a,Ge.memoizedState,e,i)},useTransition:function(){var e=Pl(Ji)[0],i=on().memoizedState;return[typeof e=="boolean"?e:mo(e),i]},useSyncExternalStore:v0,useId:j0,useHostTransitionStatus:gf,useFormState:L0,useActionState:L0,useOptimistic:function(e,i){var a=on();return T0(a,Ge,e,i)},useMemoCache:lf,useCacheRefresh:Z0};vf.useEffectEvent=B0;var tm={readContext:Cn,use:Ol,useCallback:V0,useContext:Cn,useEffect:df,useImperativeHandle:G0,useInsertionEffect:F0,useLayoutEffect:I0,useMemo:k0,useReducer:uf,useRef:P0,useState:function(){return uf(Ji)},useDebugValue:pf,useDeferredValue:function(e,i){var a=on();return Ge===null?mf(a,e,i):X0(a,Ge.memoizedState,e,i)},useTransition:function(){var e=uf(Ji)[0],i=on().memoizedState;return[typeof e=="boolean"?e:mo(e),i]},useSyncExternalStore:v0,useId:j0,useHostTransitionStatus:gf,useFormState:O0,useActionState:O0,useOptimistic:function(e,i){var a=on();return Ge!==null?T0(a,Ge,e,i):(a.baseState=e,[e,a.queue.dispatch])},useMemoCache:lf,useCacheRefresh:Z0};tm.useEffectEvent=B0;function yf(e,i,a,o){i=e.memoizedState,a=a(o,i),a=a==null?i:g({},i,a),e.memoizedState=a,e.lanes===0&&(e.updateQueue.baseState=a)}var Sf={enqueueSetState:function(e,i,a){e=e._reactInternals;var o=ai(),u=wa(o);u.payload=i,a!=null&&(u.callback=a),i=Da(e,u,o),i!==null&&(Wn(i,e,o),uo(i,e,o))},enqueueReplaceState:function(e,i,a){e=e._reactInternals;var o=ai(),u=wa(o);u.tag=1,u.payload=i,a!=null&&(u.callback=a),i=Da(e,u,o),i!==null&&(Wn(i,e,o),uo(i,e,o))},enqueueForceUpdate:function(e,i){e=e._reactInternals;var a=ai(),o=wa(a);o.tag=2,i!=null&&(o.callback=i),i=Da(e,o,a),i!==null&&(Wn(i,e,a),uo(i,e,a))}};function em(e,i,a,o,u,h,v){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(o,h,v):i.prototype&&i.prototype.isPureReactComponent?!no(a,o)||!no(u,h):!0}function nm(e,i,a,o){e=i.state,typeof i.componentWillReceiveProps=="function"&&i.componentWillReceiveProps(a,o),typeof i.UNSAFE_componentWillReceiveProps=="function"&&i.UNSAFE_componentWillReceiveProps(a,o),i.state!==e&&Sf.enqueueReplaceState(i,i.state,null)}function vs(e,i){var a=i;if("ref"in i){a={};for(var o in i)o!=="ref"&&(a[o]=i[o])}if(e=e.defaultProps){a===i&&(a=g({},a));for(var u in e)a[u]===void 0&&(a[u]=e[u])}return a}function im(e){xl(e)}function am(e){console.error(e)}function sm(e){xl(e)}function Il(e,i){try{var a=e.onUncaughtError;a(i.value,{componentStack:i.stack})}catch(o){setTimeout(function(){throw o})}}function rm(e,i,a){try{var o=e.onCaughtError;o(a.value,{componentStack:a.stack,errorBoundary:i.tag===1?i.stateNode:null})}catch(u){setTimeout(function(){throw u})}}function Mf(e,i,a){return a=wa(a),a.tag=3,a.payload={element:null},a.callback=function(){Il(e,i)},a}function om(e){return e=wa(e),e.tag=3,e}function lm(e,i,a,o){var u=a.type.getDerivedStateFromError;if(typeof u=="function"){var h=o.value;e.payload=function(){return u(h)},e.callback=function(){rm(i,a,o)}}var v=a.stateNode;v!==null&&typeof v.componentDidCatch=="function"&&(e.callback=function(){rm(i,a,o),typeof u!="function"&&(za===null?za=new Set([this]):za.add(this));var T=o.stack;this.componentDidCatch(o.value,{componentStack:T!==null?T:""})})}function oy(e,i,a,o,u){if(a.flags|=32768,o!==null&&typeof o=="object"&&typeof o.then=="function"){if(i=a.alternate,i!==null&&Ys(i,a,u,!0),a=ti.current,a!==null){switch(a.tag){case 31:case 13:return di===null?Ql():a.alternate===null&&nn===0&&(nn=3),a.flags&=-257,a.flags|=65536,a.lanes=u,o===Al?a.flags|=16384:(i=a.updateQueue,i===null?a.updateQueue=new Set([o]):i.add(o),Yf(e,o,u)),!1;case 22:return a.flags|=65536,o===Al?a.flags|=16384:(i=a.updateQueue,i===null?(i={transitions:null,markerInstances:null,retryQueue:new Set([o])},a.updateQueue=i):(a=i.retryQueue,a===null?i.retryQueue=new Set([o]):a.add(o)),Yf(e,o,u)),!1}throw Error(s(435,a.tag))}return Yf(e,o,u),Ql(),!1}if(Ce)return i=ti.current,i!==null?((i.flags&65536)===0&&(i.flags|=256),i.flags|=65536,i.lanes=u,o!==Hu&&(e=Error(s(422),{cause:o}),so(ci(e,a)))):(o!==Hu&&(i=Error(s(423),{cause:o}),so(ci(i,a))),e=e.current.alternate,e.flags|=65536,u&=-u,e.lanes|=u,o=ci(o,a),u=Mf(e.stateNode,o,u),Qu(e,u),nn!==4&&(nn=2)),!1;var h=Error(s(520),{cause:o});if(h=ci(h,a),To===null?To=[h]:To.push(h),nn!==4&&(nn=2),i===null)return!0;o=ci(o,a),a=i;do{switch(a.tag){case 3:return a.flags|=65536,e=u&-u,a.lanes|=e,e=Mf(a.stateNode,o,e),Qu(a,e),!1;case 1:if(i=a.type,h=a.stateNode,(a.flags&128)===0&&(typeof i.getDerivedStateFromError=="function"||h!==null&&typeof h.componentDidCatch=="function"&&(za===null||!za.has(h))))return a.flags|=65536,u&=-u,a.lanes|=u,u=om(u),lm(u,e,a,o),Qu(a,u),!1}a=a.return}while(a!==null);return!1}var bf=Error(s(461)),fn=!1;function wn(e,i,a,o){i.child=e===null?h0(i,null,a,o):gs(i,e.child,a,o)}function cm(e,i,a,o,u){a=a.render;var h=i.ref;if("ref"in o){var v={};for(var T in o)T!=="ref"&&(v[T]=o[T])}else v=o;return ds(i),o=af(e,i,a,v,h,u),T=sf(),e!==null&&!fn?(rf(e,i,u),$i(e,i,u)):(Ce&&T&&Fu(i),i.flags|=1,wn(e,i,o,u),i.child)}function um(e,i,a,o,u){if(e===null){var h=a.type;return typeof h=="function"&&!Pu(h)&&h.defaultProps===void 0&&a.compare===null?(i.tag=15,i.type=h,fm(e,i,h,o,u)):(e=yl(a.type,null,o,i,i.mode,u),e.ref=i.ref,e.return=i,i.child=e)}if(h=e.child,!Uf(e,u)){var v=h.memoizedProps;if(a=a.compare,a=a!==null?a:no,a(v,o)&&e.ref===i.ref)return $i(e,i,u)}return i.flags|=1,e=Yi(h,o),e.ref=i.ref,e.return=i,i.child=e}function fm(e,i,a,o,u){if(e!==null){var h=e.memoizedProps;if(no(h,o)&&e.ref===i.ref)if(fn=!1,i.pendingProps=o=h,Uf(e,u))(e.flags&131072)!==0&&(fn=!0);else return i.lanes=e.lanes,$i(e,i,u)}return Ef(e,i,a,o,u)}function hm(e,i,a,o){var u=o.children,h=e!==null?e.memoizedState:null;if(e===null&&i.stateNode===null&&(i.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),o.mode==="hidden"){if((i.flags&128)!==0){if(h=h!==null?h.baseLanes|a:a,e!==null){for(o=i.child=e.child,u=0;o!==null;)u=u|o.lanes|o.childLanes,o=o.sibling;o=u&~h}else o=0,i.child=null;return dm(e,i,h,a,o)}if((a&536870912)!==0)i.memoizedState={baseLanes:0,cachePool:null},e!==null&&El(i,h!==null?h.cachePool:null),h!==null?m0(i,h):$u(),x0(i);else return o=i.lanes=536870912,dm(e,i,h!==null?h.baseLanes|a:a,a,o)}else h!==null?(El(i,h.cachePool),m0(i,h),La(),i.memoizedState=null):(e!==null&&El(i,null),$u(),La());return wn(e,i,u,a),i.child}function _o(e,i){return e!==null&&e.tag===22||i.stateNode!==null||(i.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),i.sibling}function dm(e,i,a,o,u){var h=Yu();return h=h===null?null:{parent:cn._currentValue,pool:h},i.memoizedState={baseLanes:a,cachePool:h},e!==null&&El(i,null),$u(),x0(i),e!==null&&Ys(e,i,o,!0),i.childLanes=u,null}function Hl(e,i){return i=Vl({mode:i.mode,children:i.children},e.mode),i.ref=e.ref,e.child=i,i.return=e,i}function pm(e,i,a){return gs(i,e.child,null,a),e=Hl(i,i.pendingProps),e.flags|=2,ei(i),i.memoizedState=null,e}function ly(e,i,a){var o=i.pendingProps,u=(i.flags&128)!==0;if(i.flags&=-129,e===null){if(Ce){if(o.mode==="hidden")return e=Hl(i,o),i.lanes=536870912,_o(null,e);if(ef(i),(e=Ke)?(e=Ax(e,hi),e=e!==null&&e.data==="&"?e:null,e!==null&&(i.memoizedState={dehydrated:e,treeContext:Ea!==null?{id:Di,overflow:Ui}:null,retryLane:536870912,hydrationErrors:null},a=Qp(e),a.return=i,i.child=a,Rn=i,Ke=null)):e=null,e===null)throw Aa(i);return i.lanes=536870912,null}return Hl(i,o)}var h=e.memoizedState;if(h!==null){var v=h.dehydrated;if(ef(i),u)if(i.flags&256)i.flags&=-257,i=pm(e,i,a);else if(i.memoizedState!==null)i.child=e.child,i.flags|=128,i=null;else throw Error(s(558));else if(fn||Ys(e,i,a,!1),u=(a&e.childLanes)!==0,fn||u){if(o=Ye,o!==null&&(v=Wr(o,a),v!==0&&v!==h.retryLane))throw h.retryLane=v,cs(e,v),Wn(o,e,v),bf;Ql(),i=pm(e,i,a)}else e=h.treeContext,Ke=pi(v.nextSibling),Rn=i,Ce=!0,Ta=null,hi=!1,e!==null&&t0(i,e),i=Hl(i,o),i.flags|=4096;return i}return e=Yi(e.child,{mode:o.mode,children:o.children}),e.ref=i.ref,i.child=e,e.return=i,e}function Gl(e,i){var a=i.ref;if(a===null)e!==null&&e.ref!==null&&(i.flags|=4194816);else{if(typeof a!="function"&&typeof a!="object")throw Error(s(284));(e===null||e.ref!==a)&&(i.flags|=4194816)}}function Ef(e,i,a,o,u){return ds(i),a=af(e,i,a,o,void 0,u),o=sf(),e!==null&&!fn?(rf(e,i,u),$i(e,i,u)):(Ce&&o&&Fu(i),i.flags|=1,wn(e,i,a,u),i.child)}function mm(e,i,a,o,u,h){return ds(i),i.updateQueue=null,a=_0(i,o,a,u),g0(e),o=sf(),e!==null&&!fn?(rf(e,i,h),$i(e,i,h)):(Ce&&o&&Fu(i),i.flags|=1,wn(e,i,a,h),i.child)}function xm(e,i,a,o,u){if(ds(i),i.stateNode===null){var h=ks,v=a.contextType;typeof v=="object"&&v!==null&&(h=Cn(v)),h=new a(o,h),i.memoizedState=h.state!==null&&h.state!==void 0?h.state:null,h.updater=Sf,i.stateNode=h,h._reactInternals=i,h=i.stateNode,h.props=o,h.state=i.memoizedState,h.refs={},Zu(i),v=a.contextType,h.context=typeof v=="object"&&v!==null?Cn(v):ks,h.state=i.memoizedState,v=a.getDerivedStateFromProps,typeof v=="function"&&(yf(i,a,v,o),h.state=i.memoizedState),typeof a.getDerivedStateFromProps=="function"||typeof h.getSnapshotBeforeUpdate=="function"||typeof h.UNSAFE_componentWillMount!="function"&&typeof h.componentWillMount!="function"||(v=h.state,typeof h.componentWillMount=="function"&&h.componentWillMount(),typeof h.UNSAFE_componentWillMount=="function"&&h.UNSAFE_componentWillMount(),v!==h.state&&Sf.enqueueReplaceState(h,h.state,null),ho(i,o,h,u),fo(),h.state=i.memoizedState),typeof h.componentDidMount=="function"&&(i.flags|=4194308),o=!0}else if(e===null){h=i.stateNode;var T=i.memoizedProps,I=vs(a,T);h.props=I;var $=h.context,ht=a.contextType;v=ks,typeof ht=="object"&&ht!==null&&(v=Cn(ht));var mt=a.getDerivedStateFromProps;ht=typeof mt=="function"||typeof h.getSnapshotBeforeUpdate=="function",T=i.pendingProps!==T,ht||typeof h.UNSAFE_componentWillReceiveProps!="function"&&typeof h.componentWillReceiveProps!="function"||(T||$!==v)&&nm(i,h,o,v),Ca=!1;var et=i.memoizedState;h.state=et,ho(i,o,h,u),fo(),$=i.memoizedState,T||et!==$||Ca?(typeof mt=="function"&&(yf(i,a,mt,o),$=i.memoizedState),(I=Ca||em(i,a,I,o,et,$,v))?(ht||typeof h.UNSAFE_componentWillMount!="function"&&typeof h.componentWillMount!="function"||(typeof h.componentWillMount=="function"&&h.componentWillMount(),typeof h.UNSAFE_componentWillMount=="function"&&h.UNSAFE_componentWillMount()),typeof h.componentDidMount=="function"&&(i.flags|=4194308)):(typeof h.componentDidMount=="function"&&(i.flags|=4194308),i.memoizedProps=o,i.memoizedState=$),h.props=o,h.state=$,h.context=v,o=I):(typeof h.componentDidMount=="function"&&(i.flags|=4194308),o=!1)}else{h=i.stateNode,Ku(e,i),v=i.memoizedProps,ht=vs(a,v),h.props=ht,mt=i.pendingProps,et=h.context,$=a.contextType,I=ks,typeof $=="object"&&$!==null&&(I=Cn($)),T=a.getDerivedStateFromProps,($=typeof T=="function"||typeof h.getSnapshotBeforeUpdate=="function")||typeof h.UNSAFE_componentWillReceiveProps!="function"&&typeof h.componentWillReceiveProps!="function"||(v!==mt||et!==I)&&nm(i,h,o,I),Ca=!1,et=i.memoizedState,h.state=et,ho(i,o,h,u),fo();var rt=i.memoizedState;v!==mt||et!==rt||Ca||e!==null&&e.dependencies!==null&&Ml(e.dependencies)?(typeof T=="function"&&(yf(i,a,T,o),rt=i.memoizedState),(ht=Ca||em(i,a,ht,o,et,rt,I)||e!==null&&e.dependencies!==null&&Ml(e.dependencies))?($||typeof h.UNSAFE_componentWillUpdate!="function"&&typeof h.componentWillUpdate!="function"||(typeof h.componentWillUpdate=="function"&&h.componentWillUpdate(o,rt,I),typeof h.UNSAFE_componentWillUpdate=="function"&&h.UNSAFE_componentWillUpdate(o,rt,I)),typeof h.componentDidUpdate=="function"&&(i.flags|=4),typeof h.getSnapshotBeforeUpdate=="function"&&(i.flags|=1024)):(typeof h.componentDidUpdate!="function"||v===e.memoizedProps&&et===e.memoizedState||(i.flags|=4),typeof h.getSnapshotBeforeUpdate!="function"||v===e.memoizedProps&&et===e.memoizedState||(i.flags|=1024),i.memoizedProps=o,i.memoizedState=rt),h.props=o,h.state=rt,h.context=I,o=ht):(typeof h.componentDidUpdate!="function"||v===e.memoizedProps&&et===e.memoizedState||(i.flags|=4),typeof h.getSnapshotBeforeUpdate!="function"||v===e.memoizedProps&&et===e.memoizedState||(i.flags|=1024),o=!1)}return h=o,Gl(e,i),o=(i.flags&128)!==0,h||o?(h=i.stateNode,a=o&&typeof a.getDerivedStateFromError!="function"?null:h.render(),i.flags|=1,e!==null&&o?(i.child=gs(i,e.child,null,u),i.child=gs(i,null,a,u)):wn(e,i,a,u),i.memoizedState=h.state,e=i.child):e=$i(e,i,u),e}function gm(e,i,a,o){return fs(),i.flags|=256,wn(e,i,a,o),i.child}var Tf={dehydrated:null,treeContext:null,retryLane:0,hydrationErrors:null};function Af(e){return{baseLanes:e,cachePool:r0()}}function Rf(e,i,a){return e=e!==null?e.childLanes&~a:0,i&&(e|=ii),e}function _m(e,i,a){var o=i.pendingProps,u=!1,h=(i.flags&128)!==0,v;if((v=h)||(v=e!==null&&e.memoizedState===null?!1:(rn.current&2)!==0),v&&(u=!0,i.flags&=-129),v=(i.flags&32)!==0,i.flags&=-33,e===null){if(Ce){if(u?Ua(i):La(),(e=Ke)?(e=Ax(e,hi),e=e!==null&&e.data!=="&"?e:null,e!==null&&(i.memoizedState={dehydrated:e,treeContext:Ea!==null?{id:Di,overflow:Ui}:null,retryLane:536870912,hydrationErrors:null},a=Qp(e),a.return=i,i.child=a,Rn=i,Ke=null)):e=null,e===null)throw Aa(i);return ch(e)?i.lanes=32:i.lanes=536870912,null}var T=o.children;return o=o.fallback,u?(La(),u=i.mode,T=Vl({mode:"hidden",children:T},u),o=us(o,u,a,null),T.return=i,o.return=i,T.sibling=o,i.child=T,o=i.child,o.memoizedState=Af(a),o.childLanes=Rf(e,v,a),i.memoizedState=Tf,_o(null,o)):(Ua(i),Cf(i,T))}var I=e.memoizedState;if(I!==null&&(T=I.dehydrated,T!==null)){if(h)i.flags&256?(Ua(i),i.flags&=-257,i=wf(e,i,a)):i.memoizedState!==null?(La(),i.child=e.child,i.flags|=128,i=null):(La(),T=o.fallback,u=i.mode,o=Vl({mode:"visible",children:o.children},u),T=us(T,u,a,null),T.flags|=2,o.return=i,T.return=i,o.sibling=T,i.child=o,gs(i,e.child,null,a),o=i.child,o.memoizedState=Af(a),o.childLanes=Rf(e,v,a),i.memoizedState=Tf,i=_o(null,o));else if(Ua(i),ch(T)){if(v=T.nextSibling&&T.nextSibling.dataset,v)var $=v.dgst;v=$,o=Error(s(419)),o.stack="",o.digest=v,so({value:o,source:null,stack:null}),i=wf(e,i,a)}else if(fn||Ys(e,i,a,!1),v=(a&e.childLanes)!==0,fn||v){if(v=Ye,v!==null&&(o=Wr(v,a),o!==0&&o!==I.retryLane))throw I.retryLane=o,cs(e,o),Wn(v,e,o),bf;lh(T)||Ql(),i=wf(e,i,a)}else lh(T)?(i.flags|=192,i.child=e.child,i=null):(e=I.treeContext,Ke=pi(T.nextSibling),Rn=i,Ce=!0,Ta=null,hi=!1,e!==null&&t0(i,e),i=Cf(i,o.children),i.flags|=4096);return i}return u?(La(),T=o.fallback,u=i.mode,I=e.child,$=I.sibling,o=Yi(I,{mode:"hidden",children:o.children}),o.subtreeFlags=I.subtreeFlags&65011712,$!==null?T=Yi($,T):(T=us(T,u,a,null),T.flags|=2),T.return=i,o.return=i,o.sibling=T,i.child=o,_o(null,o),o=i.child,T=e.child.memoizedState,T===null?T=Af(a):(u=T.cachePool,u!==null?(I=cn._currentValue,u=u.parent!==I?{parent:I,pool:I}:u):u=r0(),T={baseLanes:T.baseLanes|a,cachePool:u}),o.memoizedState=T,o.childLanes=Rf(e,v,a),i.memoizedState=Tf,_o(e.child,o)):(Ua(i),a=e.child,e=a.sibling,a=Yi(a,{mode:"visible",children:o.children}),a.return=i,a.sibling=null,e!==null&&(v=i.deletions,v===null?(i.deletions=[e],i.flags|=16):v.push(e)),i.child=a,i.memoizedState=null,a)}function Cf(e,i){return i=Vl({mode:"visible",children:i},e.mode),i.return=e,e.child=i}function Vl(e,i){return e=$n(22,e,null,i),e.lanes=0,e}function wf(e,i,a){return gs(i,e.child,null,a),e=Cf(i,i.pendingProps.children),e.flags|=2,i.memoizedState=null,e}function vm(e,i,a){e.lanes|=i;var o=e.alternate;o!==null&&(o.lanes|=i),ku(e.return,i,a)}function Df(e,i,a,o,u,h){var v=e.memoizedState;v===null?e.memoizedState={isBackwards:i,rendering:null,renderingStartTime:0,last:o,tail:a,tailMode:u,treeForkCount:h}:(v.isBackwards=i,v.rendering=null,v.renderingStartTime=0,v.last=o,v.tail=a,v.tailMode=u,v.treeForkCount=h)}function ym(e,i,a){var o=i.pendingProps,u=o.revealOrder,h=o.tail;o=o.children;var v=rn.current,T=(v&2)!==0;if(T?(v=v&1|2,i.flags|=128):v&=1,_t(rn,v),wn(e,i,o,a),o=Ce?ao:0,!T&&e!==null&&(e.flags&128)!==0)t:for(e=i.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&vm(e,a,i);else if(e.tag===19)vm(e,a,i);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===i)break t;for(;e.sibling===null;){if(e.return===null||e.return===i)break t;e=e.return}e.sibling.return=e.return,e=e.sibling}switch(u){case"forwards":for(a=i.child,u=null;a!==null;)e=a.alternate,e!==null&&Dl(e)===null&&(u=a),a=a.sibling;a=u,a===null?(u=i.child,i.child=null):(u=a.sibling,a.sibling=null),Df(i,!1,u,a,h,o);break;case"backwards":case"unstable_legacy-backwards":for(a=null,u=i.child,i.child=null;u!==null;){if(e=u.alternate,e!==null&&Dl(e)===null){i.child=u;break}e=u.sibling,u.sibling=a,a=u,u=e}Df(i,!0,a,null,h,o);break;case"together":Df(i,!1,null,null,void 0,o);break;default:i.memoizedState=null}return i.child}function $i(e,i,a){if(e!==null&&(i.dependencies=e.dependencies),Pa|=i.lanes,(a&i.childLanes)===0)if(e!==null){if(Ys(e,i,a,!1),(a&i.childLanes)===0)return null}else return null;if(e!==null&&i.child!==e.child)throw Error(s(153));if(i.child!==null){for(e=i.child,a=Yi(e,e.pendingProps),i.child=a,a.return=i;e.sibling!==null;)e=e.sibling,a=a.sibling=Yi(e,e.pendingProps),a.return=i;a.sibling=null}return i.child}function Uf(e,i){return(e.lanes&i)!==0?!0:(e=e.dependencies,!!(e!==null&&Ml(e)))}function cy(e,i,a){switch(i.tag){case 3:Ot(i,i.stateNode.containerInfo),Ra(i,cn,e.memoizedState.cache),fs();break;case 27:case 5:Zt(i);break;case 4:Ot(i,i.stateNode.containerInfo);break;case 10:Ra(i,i.type,i.memoizedProps.value);break;case 31:if(i.memoizedState!==null)return i.flags|=128,ef(i),null;break;case 13:var o=i.memoizedState;if(o!==null)return o.dehydrated!==null?(Ua(i),i.flags|=128,null):(a&i.child.childLanes)!==0?_m(e,i,a):(Ua(i),e=$i(e,i,a),e!==null?e.sibling:null);Ua(i);break;case 19:var u=(e.flags&128)!==0;if(o=(a&i.childLanes)!==0,o||(Ys(e,i,a,!1),o=(a&i.childLanes)!==0),u){if(o)return ym(e,i,a);i.flags|=128}if(u=i.memoizedState,u!==null&&(u.rendering=null,u.tail=null,u.lastEffect=null),_t(rn,rn.current),o)break;return null;case 22:return i.lanes=0,hm(e,i,a,i.pendingProps);case 24:Ra(i,cn,e.memoizedState.cache)}return $i(e,i,a)}function Sm(e,i,a){if(e!==null)if(e.memoizedProps!==i.pendingProps)fn=!0;else{if(!Uf(e,a)&&(i.flags&128)===0)return fn=!1,cy(e,i,a);fn=(e.flags&131072)!==0}else fn=!1,Ce&&(i.flags&1048576)!==0&&$p(i,ao,i.index);switch(i.lanes=0,i.tag){case 16:t:{var o=i.pendingProps;if(e=ms(i.elementType),i.type=e,typeof e=="function")Pu(e)?(o=vs(e,o),i.tag=1,i=xm(null,i,e,o,a)):(i.tag=0,i=Ef(null,i,e,o,a));else{if(e!=null){var u=e.$$typeof;if(u===O){i.tag=11,i=cm(null,i,e,o,a);break t}else if(u===F){i.tag=14,i=um(null,i,e,o,a);break t}}throw i=pt(e)||e,Error(s(306,i,""))}}return i;case 0:return Ef(e,i,i.type,i.pendingProps,a);case 1:return o=i.type,u=vs(o,i.pendingProps),xm(e,i,o,u,a);case 3:t:{if(Ot(i,i.stateNode.containerInfo),e===null)throw Error(s(387));o=i.pendingProps;var h=i.memoizedState;u=h.element,Ku(e,i),ho(i,o,null,a);var v=i.memoizedState;if(o=v.cache,Ra(i,cn,o),o!==h.cache&&Xu(i,[cn],a,!0),fo(),o=v.element,h.isDehydrated)if(h={element:o,isDehydrated:!1,cache:v.cache},i.updateQueue.baseState=h,i.memoizedState=h,i.flags&256){i=gm(e,i,o,a);break t}else if(o!==u){u=ci(Error(s(424)),i),so(u),i=gm(e,i,o,a);break t}else for(e=i.stateNode.containerInfo,e.nodeType===9?e=e.body:e=e.nodeName==="HTML"?e.ownerDocument.body:e,Ke=pi(e.firstChild),Rn=i,Ce=!0,Ta=null,hi=!0,a=h0(i,null,o,a),i.child=a;a;)a.flags=a.flags&-3|4096,a=a.sibling;else{if(fs(),o===u){i=$i(e,i,a);break t}wn(e,i,o,a)}i=i.child}return i;case 26:return Gl(e,i),e===null?(a=Lx(i.type,null,i.pendingProps,null))?i.memoizedState=a:Ce||(a=i.type,e=i.pendingProps,o=ac(at.current).createElement(a),o[ln]=i,o[pn]=e,Dn(o,a,e),tt(o),i.stateNode=o):i.memoizedState=Lx(i.type,e.memoizedProps,i.pendingProps,e.memoizedState),null;case 27:return Zt(i),e===null&&Ce&&(o=i.stateNode=wx(i.type,i.pendingProps,at.current),Rn=i,hi=!0,u=Ke,Ha(i.type)?(uh=u,Ke=pi(o.firstChild)):Ke=u),wn(e,i,i.pendingProps.children,a),Gl(e,i),e===null&&(i.flags|=4194304),i.child;case 5:return e===null&&Ce&&((u=o=Ke)&&(o=Iy(o,i.type,i.pendingProps,hi),o!==null?(i.stateNode=o,Rn=i,Ke=pi(o.firstChild),hi=!1,u=!0):u=!1),u||Aa(i)),Zt(i),u=i.type,h=i.pendingProps,v=e!==null?e.memoizedProps:null,o=h.children,sh(u,h)?o=null:v!==null&&sh(u,v)&&(i.flags|=32),i.memoizedState!==null&&(u=af(e,i,ty,null,null,a),No._currentValue=u),Gl(e,i),wn(e,i,o,a),i.child;case 6:return e===null&&Ce&&((e=a=Ke)&&(a=Hy(a,i.pendingProps,hi),a!==null?(i.stateNode=a,Rn=i,Ke=null,e=!0):e=!1),e||Aa(i)),null;case 13:return _m(e,i,a);case 4:return Ot(i,i.stateNode.containerInfo),o=i.pendingProps,e===null?i.child=gs(i,null,o,a):wn(e,i,o,a),i.child;case 11:return cm(e,i,i.type,i.pendingProps,a);case 7:return wn(e,i,i.pendingProps,a),i.child;case 8:return wn(e,i,i.pendingProps.children,a),i.child;case 12:return wn(e,i,i.pendingProps.children,a),i.child;case 10:return o=i.pendingProps,Ra(i,i.type,o.value),wn(e,i,o.children,a),i.child;case 9:return u=i.type._context,o=i.pendingProps.children,ds(i),u=Cn(u),o=o(u),i.flags|=1,wn(e,i,o,a),i.child;case 14:return um(e,i,i.type,i.pendingProps,a);case 15:return fm(e,i,i.type,i.pendingProps,a);case 19:return ym(e,i,a);case 31:return ly(e,i,a);case 22:return hm(e,i,a,i.pendingProps);case 24:return ds(i),o=Cn(cn),e===null?(u=Yu(),u===null&&(u=Ye,h=Wu(),u.pooledCache=h,h.refCount++,h!==null&&(u.pooledCacheLanes|=a),u=h),i.memoizedState={parent:o,cache:u},Zu(i),Ra(i,cn,u)):((e.lanes&a)!==0&&(Ku(e,i),ho(i,null,null,a),fo()),u=e.memoizedState,h=i.memoizedState,u.parent!==o?(u={parent:o,cache:o},i.memoizedState=u,i.lanes===0&&(i.memoizedState=i.updateQueue.baseState=u),Ra(i,cn,o)):(o=h.cache,Ra(i,cn,o),o!==u.cache&&Xu(i,[cn],a,!0))),wn(e,i,i.pendingProps.children,a),i.child;case 29:throw i.pendingProps}throw Error(s(156,i.tag))}function ta(e){e.flags|=4}function Lf(e,i,a,o,u){if((i=(e.mode&32)!==0)&&(i=!1),i){if(e.flags|=16777216,(u&335544128)===u)if(e.stateNode.complete)e.flags|=8192;else if(jm())e.flags|=8192;else throw xs=Al,ju}else e.flags&=-16777217}function Mm(e,i){if(i.type!=="stylesheet"||(i.state.loading&4)!==0)e.flags&=-16777217;else if(e.flags|=16777216,!Bx(i))if(jm())e.flags|=8192;else throw xs=Al,ju}function kl(e,i){i!==null&&(e.flags|=4),e.flags&16384&&(i=e.tag!==22?He():536870912,e.lanes|=i,sr|=i)}function vo(e,i){if(!Ce)switch(e.tailMode){case"hidden":i=e.tail;for(var a=null;i!==null;)i.alternate!==null&&(a=i),i=i.sibling;a===null?e.tail=null:a.sibling=null;break;case"collapsed":a=e.tail;for(var o=null;a!==null;)a.alternate!==null&&(o=a),a=a.sibling;o===null?i||e.tail===null?e.tail=null:e.tail.sibling=null:o.sibling=null}}function Qe(e){var i=e.alternate!==null&&e.alternate.child===e.child,a=0,o=0;if(i)for(var u=e.child;u!==null;)a|=u.lanes|u.childLanes,o|=u.subtreeFlags&65011712,o|=u.flags&65011712,u.return=e,u=u.sibling;else for(u=e.child;u!==null;)a|=u.lanes|u.childLanes,o|=u.subtreeFlags,o|=u.flags,u.return=e,u=u.sibling;return e.subtreeFlags|=o,e.childLanes=a,i}function uy(e,i,a){var o=i.pendingProps;switch(Iu(i),i.tag){case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Qe(i),null;case 1:return Qe(i),null;case 3:return a=i.stateNode,o=null,e!==null&&(o=e.memoizedState.cache),i.memoizedState.cache!==o&&(i.flags|=2048),Ki(cn),Ht(),a.pendingContext&&(a.context=a.pendingContext,a.pendingContext=null),(e===null||e.child===null)&&(qs(i)?ta(i):e===null||e.memoizedState.isDehydrated&&(i.flags&256)===0||(i.flags|=1024,Gu())),Qe(i),null;case 26:var u=i.type,h=i.memoizedState;return e===null?(ta(i),h!==null?(Qe(i),Mm(i,h)):(Qe(i),Lf(i,u,null,o,a))):h?h!==e.memoizedState?(ta(i),Qe(i),Mm(i,h)):(Qe(i),i.flags&=-16777217):(e=e.memoizedProps,e!==o&&ta(i),Qe(i),Lf(i,u,e,o,a)),null;case 27:if(pe(i),a=at.current,u=i.type,e!==null&&i.stateNode!=null)e.memoizedProps!==o&&ta(i);else{if(!o){if(i.stateNode===null)throw Error(s(166));return Qe(i),null}e=Rt.current,qs(i)?e0(i):(e=wx(u,o,a),i.stateNode=e,ta(i))}return Qe(i),null;case 5:if(pe(i),u=i.type,e!==null&&i.stateNode!=null)e.memoizedProps!==o&&ta(i);else{if(!o){if(i.stateNode===null)throw Error(s(166));return Qe(i),null}if(h=Rt.current,qs(i))e0(i);else{var v=ac(at.current);switch(h){case 1:h=v.createElementNS("http://www.w3.org/2000/svg",u);break;case 2:h=v.createElementNS("http://www.w3.org/1998/Math/MathML",u);break;default:switch(u){case"svg":h=v.createElementNS("http://www.w3.org/2000/svg",u);break;case"math":h=v.createElementNS("http://www.w3.org/1998/Math/MathML",u);break;case"script":h=v.createElement("div"),h.innerHTML="<script><\/script>",h=h.removeChild(h.firstChild);break;case"select":h=typeof o.is=="string"?v.createElement("select",{is:o.is}):v.createElement("select"),o.multiple?h.multiple=!0:o.size&&(h.size=o.size);break;default:h=typeof o.is=="string"?v.createElement(u,{is:o.is}):v.createElement(u)}}h[ln]=i,h[pn]=o;t:for(v=i.child;v!==null;){if(v.tag===5||v.tag===6)h.appendChild(v.stateNode);else if(v.tag!==4&&v.tag!==27&&v.child!==null){v.child.return=v,v=v.child;continue}if(v===i)break t;for(;v.sibling===null;){if(v.return===null||v.return===i)break t;v=v.return}v.sibling.return=v.return,v=v.sibling}i.stateNode=h;t:switch(Dn(h,u,o),u){case"button":case"input":case"select":case"textarea":o=!!o.autoFocus;break t;case"img":o=!0;break t;default:o=!1}o&&ta(i)}}return Qe(i),Lf(i,i.type,e===null?null:e.memoizedProps,i.pendingProps,a),null;case 6:if(e&&i.stateNode!=null)e.memoizedProps!==o&&ta(i);else{if(typeof o!="string"&&i.stateNode===null)throw Error(s(166));if(e=at.current,qs(i)){if(e=i.stateNode,a=i.memoizedProps,o=null,u=Rn,u!==null)switch(u.tag){case 27:case 5:o=u.memoizedProps}e[ln]=i,e=!!(e.nodeValue===a||o!==null&&o.suppressHydrationWarning===!0||_x(e.nodeValue,a)),e||Aa(i,!0)}else e=ac(e).createTextNode(o),e[ln]=i,i.stateNode=e}return Qe(i),null;case 31:if(a=i.memoizedState,e===null||e.memoizedState!==null){if(o=qs(i),a!==null){if(e===null){if(!o)throw Error(s(318));if(e=i.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(s(557));e[ln]=i}else fs(),(i.flags&128)===0&&(i.memoizedState=null),i.flags|=4;Qe(i),e=!1}else a=Gu(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=a),e=!0;if(!e)return i.flags&256?(ei(i),i):(ei(i),null);if((i.flags&128)!==0)throw Error(s(558))}return Qe(i),null;case 13:if(o=i.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(u=qs(i),o!==null&&o.dehydrated!==null){if(e===null){if(!u)throw Error(s(318));if(u=i.memoizedState,u=u!==null?u.dehydrated:null,!u)throw Error(s(317));u[ln]=i}else fs(),(i.flags&128)===0&&(i.memoizedState=null),i.flags|=4;Qe(i),u=!1}else u=Gu(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=u),u=!0;if(!u)return i.flags&256?(ei(i),i):(ei(i),null)}return ei(i),(i.flags&128)!==0?(i.lanes=a,i):(a=o!==null,e=e!==null&&e.memoizedState!==null,a&&(o=i.child,u=null,o.alternate!==null&&o.alternate.memoizedState!==null&&o.alternate.memoizedState.cachePool!==null&&(u=o.alternate.memoizedState.cachePool.pool),h=null,o.memoizedState!==null&&o.memoizedState.cachePool!==null&&(h=o.memoizedState.cachePool.pool),h!==u&&(o.flags|=2048)),a!==e&&a&&(i.child.flags|=8192),kl(i,i.updateQueue),Qe(i),null);case 4:return Ht(),e===null&&th(i.stateNode.containerInfo),Qe(i),null;case 10:return Ki(i.type),Qe(i),null;case 19:if(it(rn),o=i.memoizedState,o===null)return Qe(i),null;if(u=(i.flags&128)!==0,h=o.rendering,h===null)if(u)vo(o,!1);else{if(nn!==0||e!==null&&(e.flags&128)!==0)for(e=i.child;e!==null;){if(h=Dl(e),h!==null){for(i.flags|=128,vo(o,!1),e=h.updateQueue,i.updateQueue=e,kl(i,e),i.subtreeFlags=0,e=a,a=i.child;a!==null;)Kp(a,e),a=a.sibling;return _t(rn,rn.current&1|2),Ce&&ji(i,o.treeForkCount),i.child}e=e.sibling}o.tail!==null&&E()>jl&&(i.flags|=128,u=!0,vo(o,!1),i.lanes=4194304)}else{if(!u)if(e=Dl(h),e!==null){if(i.flags|=128,u=!0,e=e.updateQueue,i.updateQueue=e,kl(i,e),vo(o,!0),o.tail===null&&o.tailMode==="hidden"&&!h.alternate&&!Ce)return Qe(i),null}else 2*E()-o.renderingStartTime>jl&&a!==536870912&&(i.flags|=128,u=!0,vo(o,!1),i.lanes=4194304);o.isBackwards?(h.sibling=i.child,i.child=h):(e=o.last,e!==null?e.sibling=h:i.child=h,o.last=h)}return o.tail!==null?(e=o.tail,o.rendering=e,o.tail=e.sibling,o.renderingStartTime=E(),e.sibling=null,a=rn.current,_t(rn,u?a&1|2:a&1),Ce&&ji(i,o.treeForkCount),e):(Qe(i),null);case 22:case 23:return ei(i),tf(),o=i.memoizedState!==null,e!==null?e.memoizedState!==null!==o&&(i.flags|=8192):o&&(i.flags|=8192),o?(a&536870912)!==0&&(i.flags&128)===0&&(Qe(i),i.subtreeFlags&6&&(i.flags|=8192)):Qe(i),a=i.updateQueue,a!==null&&kl(i,a.retryQueue),a=null,e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(a=e.memoizedState.cachePool.pool),o=null,i.memoizedState!==null&&i.memoizedState.cachePool!==null&&(o=i.memoizedState.cachePool.pool),o!==a&&(i.flags|=2048),e!==null&&it(ps),null;case 24:return a=null,e!==null&&(a=e.memoizedState.cache),i.memoizedState.cache!==a&&(i.flags|=2048),Ki(cn),Qe(i),null;case 25:return null;case 30:return null}throw Error(s(156,i.tag))}function fy(e,i){switch(Iu(i),i.tag){case 1:return e=i.flags,e&65536?(i.flags=e&-65537|128,i):null;case 3:return Ki(cn),Ht(),e=i.flags,(e&65536)!==0&&(e&128)===0?(i.flags=e&-65537|128,i):null;case 26:case 27:case 5:return pe(i),null;case 31:if(i.memoizedState!==null){if(ei(i),i.alternate===null)throw Error(s(340));fs()}return e=i.flags,e&65536?(i.flags=e&-65537|128,i):null;case 13:if(ei(i),e=i.memoizedState,e!==null&&e.dehydrated!==null){if(i.alternate===null)throw Error(s(340));fs()}return e=i.flags,e&65536?(i.flags=e&-65537|128,i):null;case 19:return it(rn),null;case 4:return Ht(),null;case 10:return Ki(i.type),null;case 22:case 23:return ei(i),tf(),e!==null&&it(ps),e=i.flags,e&65536?(i.flags=e&-65537|128,i):null;case 24:return Ki(cn),null;case 25:return null;default:return null}}function bm(e,i){switch(Iu(i),i.tag){case 3:Ki(cn),Ht();break;case 26:case 27:case 5:pe(i);break;case 4:Ht();break;case 31:i.memoizedState!==null&&ei(i);break;case 13:ei(i);break;case 19:it(rn);break;case 10:Ki(i.type);break;case 22:case 23:ei(i),tf(),e!==null&&it(ps);break;case 24:Ki(cn)}}function yo(e,i){try{var a=i.updateQueue,o=a!==null?a.lastEffect:null;if(o!==null){var u=o.next;a=u;do{if((a.tag&e)===e){o=void 0;var h=a.create,v=a.inst;o=h(),v.destroy=o}a=a.next}while(a!==u)}}catch(T){Ie(i,i.return,T)}}function Na(e,i,a){try{var o=i.updateQueue,u=o!==null?o.lastEffect:null;if(u!==null){var h=u.next;o=h;do{if((o.tag&e)===e){var v=o.inst,T=v.destroy;if(T!==void 0){v.destroy=void 0,u=i;var I=a,$=T;try{$()}catch(ht){Ie(u,I,ht)}}}o=o.next}while(o!==h)}}catch(ht){Ie(i,i.return,ht)}}function Em(e){var i=e.updateQueue;if(i!==null){var a=e.stateNode;try{p0(i,a)}catch(o){Ie(e,e.return,o)}}}function Tm(e,i,a){a.props=vs(e.type,e.memoizedProps),a.state=e.memoizedState;try{a.componentWillUnmount()}catch(o){Ie(e,i,o)}}function So(e,i){try{var a=e.ref;if(a!==null){switch(e.tag){case 26:case 27:case 5:var o=e.stateNode;break;case 30:o=e.stateNode;break;default:o=e.stateNode}typeof a=="function"?e.refCleanup=a(o):a.current=o}}catch(u){Ie(e,i,u)}}function Li(e,i){var a=e.ref,o=e.refCleanup;if(a!==null)if(typeof o=="function")try{o()}catch(u){Ie(e,i,u)}finally{e.refCleanup=null,e=e.alternate,e!=null&&(e.refCleanup=null)}else if(typeof a=="function")try{a(null)}catch(u){Ie(e,i,u)}else a.current=null}function Am(e){var i=e.type,a=e.memoizedProps,o=e.stateNode;try{t:switch(i){case"button":case"input":case"select":case"textarea":a.autoFocus&&o.focus();break t;case"img":a.src?o.src=a.src:a.srcSet&&(o.srcset=a.srcSet)}}catch(u){Ie(e,e.return,u)}}function Nf(e,i,a){try{var o=e.stateNode;Ny(o,e.type,a,i),o[pn]=i}catch(u){Ie(e,e.return,u)}}function Rm(e){return e.tag===5||e.tag===3||e.tag===26||e.tag===27&&Ha(e.type)||e.tag===4}function Of(e){t:for(;;){for(;e.sibling===null;){if(e.return===null||Rm(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.tag===27&&Ha(e.type)||e.flags&2||e.child===null||e.tag===4)continue t;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Pf(e,i,a){var o=e.tag;if(o===5||o===6)e=e.stateNode,i?(a.nodeType===9?a.body:a.nodeName==="HTML"?a.ownerDocument.body:a).insertBefore(e,i):(i=a.nodeType===9?a.body:a.nodeName==="HTML"?a.ownerDocument.body:a,i.appendChild(e),a=a._reactRootContainer,a!=null||i.onclick!==null||(i.onclick=Wi));else if(o!==4&&(o===27&&Ha(e.type)&&(a=e.stateNode,i=null),e=e.child,e!==null))for(Pf(e,i,a),e=e.sibling;e!==null;)Pf(e,i,a),e=e.sibling}function Xl(e,i,a){var o=e.tag;if(o===5||o===6)e=e.stateNode,i?a.insertBefore(e,i):a.appendChild(e);else if(o!==4&&(o===27&&Ha(e.type)&&(a=e.stateNode),e=e.child,e!==null))for(Xl(e,i,a),e=e.sibling;e!==null;)Xl(e,i,a),e=e.sibling}function Cm(e){var i=e.stateNode,a=e.memoizedProps;try{for(var o=e.type,u=i.attributes;u.length;)i.removeAttributeNode(u[0]);Dn(i,o,a),i[ln]=e,i[pn]=a}catch(h){Ie(e,e.return,h)}}var ea=!1,hn=!1,zf=!1,wm=typeof WeakSet=="function"?WeakSet:Set,bn=null;function hy(e,i){if(e=e.containerInfo,ih=fc,e=Gp(e),Cu(e)){if("selectionStart"in e)var a={start:e.selectionStart,end:e.selectionEnd};else t:{a=(a=e.ownerDocument)&&a.defaultView||window;var o=a.getSelection&&a.getSelection();if(o&&o.rangeCount!==0){a=o.anchorNode;var u=o.anchorOffset,h=o.focusNode;o=o.focusOffset;try{a.nodeType,h.nodeType}catch{a=null;break t}var v=0,T=-1,I=-1,$=0,ht=0,mt=e,et=null;e:for(;;){for(var rt;mt!==a||u!==0&&mt.nodeType!==3||(T=v+u),mt!==h||o!==0&&mt.nodeType!==3||(I=v+o),mt.nodeType===3&&(v+=mt.nodeValue.length),(rt=mt.firstChild)!==null;)et=mt,mt=rt;for(;;){if(mt===e)break e;if(et===a&&++$===u&&(T=v),et===h&&++ht===o&&(I=v),(rt=mt.nextSibling)!==null)break;mt=et,et=mt.parentNode}mt=rt}a=T===-1||I===-1?null:{start:T,end:I}}else a=null}a=a||{start:0,end:0}}else a=null;for(ah={focusedElem:e,selectionRange:a},fc=!1,bn=i;bn!==null;)if(i=bn,e=i.child,(i.subtreeFlags&1028)!==0&&e!==null)e.return=i,bn=e;else for(;bn!==null;){switch(i=bn,h=i.alternate,e=i.flags,i.tag){case 0:if((e&4)!==0&&(e=i.updateQueue,e=e!==null?e.events:null,e!==null))for(a=0;a<e.length;a++)u=e[a],u.ref.impl=u.nextImpl;break;case 11:case 15:break;case 1:if((e&1024)!==0&&h!==null){e=void 0,a=i,u=h.memoizedProps,h=h.memoizedState,o=a.stateNode;try{var jt=vs(a.type,u);e=o.getSnapshotBeforeUpdate(jt,h),o.__reactInternalSnapshotBeforeUpdate=e}catch(re){Ie(a,a.return,re)}}break;case 3:if((e&1024)!==0){if(e=i.stateNode.containerInfo,a=e.nodeType,a===9)oh(e);else if(a===1)switch(e.nodeName){case"HEAD":case"HTML":case"BODY":oh(e);break;default:e.textContent=""}}break;case 5:case 26:case 27:case 6:case 4:case 17:break;default:if((e&1024)!==0)throw Error(s(163))}if(e=i.sibling,e!==null){e.return=i.return,bn=e;break}bn=i.return}}function Dm(e,i,a){var o=a.flags;switch(a.tag){case 0:case 11:case 15:ia(e,a),o&4&&yo(5,a);break;case 1:if(ia(e,a),o&4)if(e=a.stateNode,i===null)try{e.componentDidMount()}catch(v){Ie(a,a.return,v)}else{var u=vs(a.type,i.memoizedProps);i=i.memoizedState;try{e.componentDidUpdate(u,i,e.__reactInternalSnapshotBeforeUpdate)}catch(v){Ie(a,a.return,v)}}o&64&&Em(a),o&512&&So(a,a.return);break;case 3:if(ia(e,a),o&64&&(e=a.updateQueue,e!==null)){if(i=null,a.child!==null)switch(a.child.tag){case 27:case 5:i=a.child.stateNode;break;case 1:i=a.child.stateNode}try{p0(e,i)}catch(v){Ie(a,a.return,v)}}break;case 27:i===null&&o&4&&Cm(a);case 26:case 5:ia(e,a),i===null&&o&4&&Am(a),o&512&&So(a,a.return);break;case 12:ia(e,a);break;case 31:ia(e,a),o&4&&Nm(e,a);break;case 13:ia(e,a),o&4&&Om(e,a),o&64&&(e=a.memoizedState,e!==null&&(e=e.dehydrated,e!==null&&(a=Sy.bind(null,a),Gy(e,a))));break;case 22:if(o=a.memoizedState!==null||ea,!o){i=i!==null&&i.memoizedState!==null||hn,u=ea;var h=hn;ea=o,(hn=i)&&!h?aa(e,a,(a.subtreeFlags&8772)!==0):ia(e,a),ea=u,hn=h}break;case 30:break;default:ia(e,a)}}function Um(e){var i=e.alternate;i!==null&&(e.alternate=null,Um(i)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(i=e.stateNode,i!==null&&jr(i)),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}var Je=null,Gn=!1;function na(e,i,a){for(a=a.child;a!==null;)Lm(e,i,a),a=a.sibling}function Lm(e,i,a){if(At&&typeof At.onCommitFiberUnmount=="function")try{At.onCommitFiberUnmount(Mt,a)}catch{}switch(a.tag){case 26:hn||Li(a,i),na(e,i,a),a.memoizedState?a.memoizedState.count--:a.stateNode&&(a=a.stateNode,a.parentNode.removeChild(a));break;case 27:hn||Li(a,i);var o=Je,u=Gn;Ha(a.type)&&(Je=a.stateNode,Gn=!1),na(e,i,a),Do(a.stateNode),Je=o,Gn=u;break;case 5:hn||Li(a,i);case 6:if(o=Je,u=Gn,Je=null,na(e,i,a),Je=o,Gn=u,Je!==null)if(Gn)try{(Je.nodeType===9?Je.body:Je.nodeName==="HTML"?Je.ownerDocument.body:Je).removeChild(a.stateNode)}catch(h){Ie(a,i,h)}else try{Je.removeChild(a.stateNode)}catch(h){Ie(a,i,h)}break;case 18:Je!==null&&(Gn?(e=Je,Ex(e.nodeType===9?e.body:e.nodeName==="HTML"?e.ownerDocument.body:e,a.stateNode),dr(e)):Ex(Je,a.stateNode));break;case 4:o=Je,u=Gn,Je=a.stateNode.containerInfo,Gn=!0,na(e,i,a),Je=o,Gn=u;break;case 0:case 11:case 14:case 15:Na(2,a,i),hn||Na(4,a,i),na(e,i,a);break;case 1:hn||(Li(a,i),o=a.stateNode,typeof o.componentWillUnmount=="function"&&Tm(a,i,o)),na(e,i,a);break;case 21:na(e,i,a);break;case 22:hn=(o=hn)||a.memoizedState!==null,na(e,i,a),hn=o;break;default:na(e,i,a)}}function Nm(e,i){if(i.memoizedState===null&&(e=i.alternate,e!==null&&(e=e.memoizedState,e!==null))){e=e.dehydrated;try{dr(e)}catch(a){Ie(i,i.return,a)}}}function Om(e,i){if(i.memoizedState===null&&(e=i.alternate,e!==null&&(e=e.memoizedState,e!==null&&(e=e.dehydrated,e!==null))))try{dr(e)}catch(a){Ie(i,i.return,a)}}function dy(e){switch(e.tag){case 31:case 13:case 19:var i=e.stateNode;return i===null&&(i=e.stateNode=new wm),i;case 22:return e=e.stateNode,i=e._retryCache,i===null&&(i=e._retryCache=new wm),i;default:throw Error(s(435,e.tag))}}function Wl(e,i){var a=dy(e);i.forEach(function(o){if(!a.has(o)){a.add(o);var u=My.bind(null,e,o);o.then(u,u)}})}function Vn(e,i){var a=i.deletions;if(a!==null)for(var o=0;o<a.length;o++){var u=a[o],h=e,v=i,T=v;t:for(;T!==null;){switch(T.tag){case 27:if(Ha(T.type)){Je=T.stateNode,Gn=!1;break t}break;case 5:Je=T.stateNode,Gn=!1;break t;case 3:case 4:Je=T.stateNode.containerInfo,Gn=!0;break t}T=T.return}if(Je===null)throw Error(s(160));Lm(h,v,u),Je=null,Gn=!1,h=u.alternate,h!==null&&(h.return=null),u.return=null}if(i.subtreeFlags&13886)for(i=i.child;i!==null;)Pm(i,e),i=i.sibling}var bi=null;function Pm(e,i){var a=e.alternate,o=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:Vn(i,e),kn(e),o&4&&(Na(3,e,e.return),yo(3,e),Na(5,e,e.return));break;case 1:Vn(i,e),kn(e),o&512&&(hn||a===null||Li(a,a.return)),o&64&&ea&&(e=e.updateQueue,e!==null&&(o=e.callbacks,o!==null&&(a=e.shared.hiddenCallbacks,e.shared.hiddenCallbacks=a===null?o:a.concat(o))));break;case 26:var u=bi;if(Vn(i,e),kn(e),o&512&&(hn||a===null||Li(a,a.return)),o&4){var h=a!==null?a.memoizedState:null;if(o=e.memoizedState,a===null)if(o===null)if(e.stateNode===null){t:{o=e.type,a=e.memoizedProps,u=u.ownerDocument||u;e:switch(o){case"title":h=u.getElementsByTagName("title")[0],(!h||h[ss]||h[ln]||h.namespaceURI==="http://www.w3.org/2000/svg"||h.hasAttribute("itemprop"))&&(h=u.createElement(o),u.head.insertBefore(h,u.querySelector("head > title"))),Dn(h,o,a),h[ln]=e,tt(h),o=h;break t;case"link":var v=Px("link","href",u).get(o+(a.href||""));if(v){for(var T=0;T<v.length;T++)if(h=v[T],h.getAttribute("href")===(a.href==null||a.href===""?null:a.href)&&h.getAttribute("rel")===(a.rel==null?null:a.rel)&&h.getAttribute("title")===(a.title==null?null:a.title)&&h.getAttribute("crossorigin")===(a.crossOrigin==null?null:a.crossOrigin)){v.splice(T,1);break e}}h=u.createElement(o),Dn(h,o,a),u.head.appendChild(h);break;case"meta":if(v=Px("meta","content",u).get(o+(a.content||""))){for(T=0;T<v.length;T++)if(h=v[T],h.getAttribute("content")===(a.content==null?null:""+a.content)&&h.getAttribute("name")===(a.name==null?null:a.name)&&h.getAttribute("property")===(a.property==null?null:a.property)&&h.getAttribute("http-equiv")===(a.httpEquiv==null?null:a.httpEquiv)&&h.getAttribute("charset")===(a.charSet==null?null:a.charSet)){v.splice(T,1);break e}}h=u.createElement(o),Dn(h,o,a),u.head.appendChild(h);break;default:throw Error(s(468,o))}h[ln]=e,tt(h),o=h}e.stateNode=o}else zx(u,e.type,e.stateNode);else e.stateNode=Ox(u,o,e.memoizedProps);else h!==o?(h===null?a.stateNode!==null&&(a=a.stateNode,a.parentNode.removeChild(a)):h.count--,o===null?zx(u,e.type,e.stateNode):Ox(u,o,e.memoizedProps)):o===null&&e.stateNode!==null&&Nf(e,e.memoizedProps,a.memoizedProps)}break;case 27:Vn(i,e),kn(e),o&512&&(hn||a===null||Li(a,a.return)),a!==null&&o&4&&Nf(e,e.memoizedProps,a.memoizedProps);break;case 5:if(Vn(i,e),kn(e),o&512&&(hn||a===null||Li(a,a.return)),e.flags&32){u=e.stateNode;try{wi(u,"")}catch(jt){Ie(e,e.return,jt)}}o&4&&e.stateNode!=null&&(u=e.memoizedProps,Nf(e,u,a!==null?a.memoizedProps:u)),o&1024&&(zf=!0);break;case 6:if(Vn(i,e),kn(e),o&4){if(e.stateNode===null)throw Error(s(162));o=e.memoizedProps,a=e.stateNode;try{a.nodeValue=o}catch(jt){Ie(e,e.return,jt)}}break;case 3:if(oc=null,u=bi,bi=sc(i.containerInfo),Vn(i,e),bi=u,kn(e),o&4&&a!==null&&a.memoizedState.isDehydrated)try{dr(i.containerInfo)}catch(jt){Ie(e,e.return,jt)}zf&&(zf=!1,zm(e));break;case 4:o=bi,bi=sc(e.stateNode.containerInfo),Vn(i,e),kn(e),bi=o;break;case 12:Vn(i,e),kn(e);break;case 31:Vn(i,e),kn(e),o&4&&(o=e.updateQueue,o!==null&&(e.updateQueue=null,Wl(e,o)));break;case 13:Vn(i,e),kn(e),e.child.flags&8192&&e.memoizedState!==null!=(a!==null&&a.memoizedState!==null)&&(Yl=E()),o&4&&(o=e.updateQueue,o!==null&&(e.updateQueue=null,Wl(e,o)));break;case 22:u=e.memoizedState!==null;var I=a!==null&&a.memoizedState!==null,$=ea,ht=hn;if(ea=$||u,hn=ht||I,Vn(i,e),hn=ht,ea=$,kn(e),o&8192)t:for(i=e.stateNode,i._visibility=u?i._visibility&-2:i._visibility|1,u&&(a===null||I||ea||hn||ys(e)),a=null,i=e;;){if(i.tag===5||i.tag===26){if(a===null){I=a=i;try{if(h=I.stateNode,u)v=h.style,typeof v.setProperty=="function"?v.setProperty("display","none","important"):v.display="none";else{T=I.stateNode;var mt=I.memoizedProps.style,et=mt!=null&&mt.hasOwnProperty("display")?mt.display:null;T.style.display=et==null||typeof et=="boolean"?"":(""+et).trim()}}catch(jt){Ie(I,I.return,jt)}}}else if(i.tag===6){if(a===null){I=i;try{I.stateNode.nodeValue=u?"":I.memoizedProps}catch(jt){Ie(I,I.return,jt)}}}else if(i.tag===18){if(a===null){I=i;try{var rt=I.stateNode;u?Tx(rt,!0):Tx(I.stateNode,!1)}catch(jt){Ie(I,I.return,jt)}}}else if((i.tag!==22&&i.tag!==23||i.memoizedState===null||i===e)&&i.child!==null){i.child.return=i,i=i.child;continue}if(i===e)break t;for(;i.sibling===null;){if(i.return===null||i.return===e)break t;a===i&&(a=null),i=i.return}a===i&&(a=null),i.sibling.return=i.return,i=i.sibling}o&4&&(o=e.updateQueue,o!==null&&(a=o.retryQueue,a!==null&&(o.retryQueue=null,Wl(e,a))));break;case 19:Vn(i,e),kn(e),o&4&&(o=e.updateQueue,o!==null&&(e.updateQueue=null,Wl(e,o)));break;case 30:break;case 21:break;default:Vn(i,e),kn(e)}}function kn(e){var i=e.flags;if(i&2){try{for(var a,o=e.return;o!==null;){if(Rm(o)){a=o;break}o=o.return}if(a==null)throw Error(s(160));switch(a.tag){case 27:var u=a.stateNode,h=Of(e);Xl(e,h,u);break;case 5:var v=a.stateNode;a.flags&32&&(wi(v,""),a.flags&=-33);var T=Of(e);Xl(e,T,v);break;case 3:case 4:var I=a.stateNode.containerInfo,$=Of(e);Pf(e,$,I);break;default:throw Error(s(161))}}catch(ht){Ie(e,e.return,ht)}e.flags&=-3}i&4096&&(e.flags&=-4097)}function zm(e){if(e.subtreeFlags&1024)for(e=e.child;e!==null;){var i=e;zm(i),i.tag===5&&i.flags&1024&&i.stateNode.reset(),e=e.sibling}}function ia(e,i){if(i.subtreeFlags&8772)for(i=i.child;i!==null;)Dm(e,i.alternate,i),i=i.sibling}function ys(e){for(e=e.child;e!==null;){var i=e;switch(i.tag){case 0:case 11:case 14:case 15:Na(4,i,i.return),ys(i);break;case 1:Li(i,i.return);var a=i.stateNode;typeof a.componentWillUnmount=="function"&&Tm(i,i.return,a),ys(i);break;case 27:Do(i.stateNode);case 26:case 5:Li(i,i.return),ys(i);break;case 22:i.memoizedState===null&&ys(i);break;case 30:ys(i);break;default:ys(i)}e=e.sibling}}function aa(e,i,a){for(a=a&&(i.subtreeFlags&8772)!==0,i=i.child;i!==null;){var o=i.alternate,u=e,h=i,v=h.flags;switch(h.tag){case 0:case 11:case 15:aa(u,h,a),yo(4,h);break;case 1:if(aa(u,h,a),o=h,u=o.stateNode,typeof u.componentDidMount=="function")try{u.componentDidMount()}catch($){Ie(o,o.return,$)}if(o=h,u=o.updateQueue,u!==null){var T=o.stateNode;try{var I=u.shared.hiddenCallbacks;if(I!==null)for(u.shared.hiddenCallbacks=null,u=0;u<I.length;u++)d0(I[u],T)}catch($){Ie(o,o.return,$)}}a&&v&64&&Em(h),So(h,h.return);break;case 27:Cm(h);case 26:case 5:aa(u,h,a),a&&o===null&&v&4&&Am(h),So(h,h.return);break;case 12:aa(u,h,a);break;case 31:aa(u,h,a),a&&v&4&&Nm(u,h);break;case 13:aa(u,h,a),a&&v&4&&Om(u,h);break;case 22:h.memoizedState===null&&aa(u,h,a),So(h,h.return);break;case 30:break;default:aa(u,h,a)}i=i.sibling}}function Bf(e,i){var a=null;e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(a=e.memoizedState.cachePool.pool),e=null,i.memoizedState!==null&&i.memoizedState.cachePool!==null&&(e=i.memoizedState.cachePool.pool),e!==a&&(e!=null&&e.refCount++,a!=null&&ro(a))}function Ff(e,i){e=null,i.alternate!==null&&(e=i.alternate.memoizedState.cache),i=i.memoizedState.cache,i!==e&&(i.refCount++,e!=null&&ro(e))}function Ei(e,i,a,o){if(i.subtreeFlags&10256)for(i=i.child;i!==null;)Bm(e,i,a,o),i=i.sibling}function Bm(e,i,a,o){var u=i.flags;switch(i.tag){case 0:case 11:case 15:Ei(e,i,a,o),u&2048&&yo(9,i);break;case 1:Ei(e,i,a,o);break;case 3:Ei(e,i,a,o),u&2048&&(e=null,i.alternate!==null&&(e=i.alternate.memoizedState.cache),i=i.memoizedState.cache,i!==e&&(i.refCount++,e!=null&&ro(e)));break;case 12:if(u&2048){Ei(e,i,a,o),e=i.stateNode;try{var h=i.memoizedProps,v=h.id,T=h.onPostCommit;typeof T=="function"&&T(v,i.alternate===null?"mount":"update",e.passiveEffectDuration,-0)}catch(I){Ie(i,i.return,I)}}else Ei(e,i,a,o);break;case 31:Ei(e,i,a,o);break;case 13:Ei(e,i,a,o);break;case 23:break;case 22:h=i.stateNode,v=i.alternate,i.memoizedState!==null?h._visibility&2?Ei(e,i,a,o):Mo(e,i):h._visibility&2?Ei(e,i,a,o):(h._visibility|=2,nr(e,i,a,o,(i.subtreeFlags&10256)!==0||!1)),u&2048&&Bf(v,i);break;case 24:Ei(e,i,a,o),u&2048&&Ff(i.alternate,i);break;default:Ei(e,i,a,o)}}function nr(e,i,a,o,u){for(u=u&&((i.subtreeFlags&10256)!==0||!1),i=i.child;i!==null;){var h=e,v=i,T=a,I=o,$=v.flags;switch(v.tag){case 0:case 11:case 15:nr(h,v,T,I,u),yo(8,v);break;case 23:break;case 22:var ht=v.stateNode;v.memoizedState!==null?ht._visibility&2?nr(h,v,T,I,u):Mo(h,v):(ht._visibility|=2,nr(h,v,T,I,u)),u&&$&2048&&Bf(v.alternate,v);break;case 24:nr(h,v,T,I,u),u&&$&2048&&Ff(v.alternate,v);break;default:nr(h,v,T,I,u)}i=i.sibling}}function Mo(e,i){if(i.subtreeFlags&10256)for(i=i.child;i!==null;){var a=e,o=i,u=o.flags;switch(o.tag){case 22:Mo(a,o),u&2048&&Bf(o.alternate,o);break;case 24:Mo(a,o),u&2048&&Ff(o.alternate,o);break;default:Mo(a,o)}i=i.sibling}}var bo=8192;function ir(e,i,a){if(e.subtreeFlags&bo)for(e=e.child;e!==null;)Fm(e,i,a),e=e.sibling}function Fm(e,i,a){switch(e.tag){case 26:ir(e,i,a),e.flags&bo&&e.memoizedState!==null&&$y(a,bi,e.memoizedState,e.memoizedProps);break;case 5:ir(e,i,a);break;case 3:case 4:var o=bi;bi=sc(e.stateNode.containerInfo),ir(e,i,a),bi=o;break;case 22:e.memoizedState===null&&(o=e.alternate,o!==null&&o.memoizedState!==null?(o=bo,bo=16777216,ir(e,i,a),bo=o):ir(e,i,a));break;default:ir(e,i,a)}}function Im(e){var i=e.alternate;if(i!==null&&(e=i.child,e!==null)){i.child=null;do i=e.sibling,e.sibling=null,e=i;while(e!==null)}}function Eo(e){var i=e.deletions;if((e.flags&16)!==0){if(i!==null)for(var a=0;a<i.length;a++){var o=i[a];bn=o,Gm(o,e)}Im(e)}if(e.subtreeFlags&10256)for(e=e.child;e!==null;)Hm(e),e=e.sibling}function Hm(e){switch(e.tag){case 0:case 11:case 15:Eo(e),e.flags&2048&&Na(9,e,e.return);break;case 3:Eo(e);break;case 12:Eo(e);break;case 22:var i=e.stateNode;e.memoizedState!==null&&i._visibility&2&&(e.return===null||e.return.tag!==13)?(i._visibility&=-3,ql(e)):Eo(e);break;default:Eo(e)}}function ql(e){var i=e.deletions;if((e.flags&16)!==0){if(i!==null)for(var a=0;a<i.length;a++){var o=i[a];bn=o,Gm(o,e)}Im(e)}for(e=e.child;e!==null;){switch(i=e,i.tag){case 0:case 11:case 15:Na(8,i,i.return),ql(i);break;case 22:a=i.stateNode,a._visibility&2&&(a._visibility&=-3,ql(i));break;default:ql(i)}e=e.sibling}}function Gm(e,i){for(;bn!==null;){var a=bn;switch(a.tag){case 0:case 11:case 15:Na(8,a,i);break;case 23:case 22:if(a.memoizedState!==null&&a.memoizedState.cachePool!==null){var o=a.memoizedState.cachePool.pool;o!=null&&o.refCount++}break;case 24:ro(a.memoizedState.cache)}if(o=a.child,o!==null)o.return=a,bn=o;else t:for(a=e;bn!==null;){o=bn;var u=o.sibling,h=o.return;if(Um(o),o===a){bn=null;break t}if(u!==null){u.return=h,bn=u;break t}bn=h}}}var py={getCacheForType:function(e){var i=Cn(cn),a=i.data.get(e);return a===void 0&&(a=e(),i.data.set(e,a)),a},cacheSignal:function(){return Cn(cn).controller.signal}},my=typeof WeakMap=="function"?WeakMap:Map,ze=0,Ye=null,Se=null,be=0,Fe=0,ni=null,Oa=!1,ar=!1,If=!1,sa=0,nn=0,Pa=0,Ss=0,Hf=0,ii=0,sr=0,To=null,Xn=null,Gf=!1,Yl=0,Vm=0,jl=1/0,Zl=null,za=null,xn=0,Ba=null,rr=null,ra=0,Vf=0,kf=null,km=null,Ao=0,Xf=null;function ai(){return(ze&2)!==0&&be!==0?be&-be:B.T!==null?Kf():qr()}function Xm(){if(ii===0)if((be&536870912)===0||Ce){var e=Ut;Ut<<=1,(Ut&3932160)===0&&(Ut=262144),ii=e}else ii=536870912;return e=ti.current,e!==null&&(e.flags|=32),ii}function Wn(e,i,a){(e===Ye&&(Fe===2||Fe===9)||e.cancelPendingCommit!==null)&&(or(e,0),Fa(e,be,ii,!1)),Ln(e,a),((ze&2)===0||e!==Ye)&&(e===Ye&&((ze&2)===0&&(Ss|=a),nn===4&&Fa(e,be,ii,!1)),Ni(e))}function Wm(e,i,a){if((ze&6)!==0)throw Error(s(327));var o=!a&&(i&127)===0&&(i&e.expiredLanes)===0||qt(e,i),u=o?_y(e,i):qf(e,i,!0),h=o;do{if(u===0){ar&&!o&&Fa(e,i,0,!1);break}else{if(a=e.current.alternate,h&&!xy(a)){u=qf(e,i,!1),h=!1;continue}if(u===2){if(h=i,e.errorRecoveryDisabledLanes&h)var v=0;else v=e.pendingLanes&-536870913,v=v!==0?v:v&536870912?536870912:0;if(v!==0){i=v;t:{var T=e;u=To;var I=T.current.memoizedState.isDehydrated;if(I&&(or(T,v).flags|=256),v=qf(T,v,!1),v!==2){if(If&&!I){T.errorRecoveryDisabledLanes|=h,Ss|=h,u=4;break t}h=Xn,Xn=u,h!==null&&(Xn===null?Xn=h:Xn.push.apply(Xn,h))}u=v}if(h=!1,u!==2)continue}}if(u===1){or(e,0),Fa(e,i,0,!0);break}t:{switch(o=e,h=u,h){case 0:case 1:throw Error(s(345));case 4:if((i&4194048)!==i)break;case 6:Fa(o,i,ii,!Oa);break t;case 2:Xn=null;break;case 3:case 5:break;default:throw Error(s(329))}if((i&62914560)===i&&(u=Yl+300-E(),10<u)){if(Fa(o,i,ii,!Oa),gt(o,0,!0)!==0)break t;ra=i,o.timeoutHandle=Mx(qm.bind(null,o,a,Xn,Zl,Gf,i,ii,Ss,sr,Oa,h,"Throttled",-0,0),u);break t}qm(o,a,Xn,Zl,Gf,i,ii,Ss,sr,Oa,h,null,-0,0)}}break}while(!0);Ni(e)}function qm(e,i,a,o,u,h,v,T,I,$,ht,mt,et,rt){if(e.timeoutHandle=-1,mt=i.subtreeFlags,mt&8192||(mt&16785408)===16785408){mt={stylesheets:null,count:0,imgCount:0,imgBytes:0,suspenseyImages:[],waitingForImages:!0,waitingForViewTransition:!1,unsuspend:Wi},Fm(i,h,mt);var jt=(h&62914560)===h?Yl-E():(h&4194048)===h?Vm-E():0;if(jt=tS(mt,jt),jt!==null){ra=h,e.cancelPendingCommit=jt(tx.bind(null,e,i,h,a,o,u,v,T,I,ht,mt,null,et,rt)),Fa(e,h,v,!$);return}}tx(e,i,h,a,o,u,v,T,I)}function xy(e){for(var i=e;;){var a=i.tag;if((a===0||a===11||a===15)&&i.flags&16384&&(a=i.updateQueue,a!==null&&(a=a.stores,a!==null)))for(var o=0;o<a.length;o++){var u=a[o],h=u.getSnapshot;u=u.value;try{if(!Jn(h(),u))return!1}catch{return!1}}if(a=i.child,i.subtreeFlags&16384&&a!==null)a.return=i,i=a;else{if(i===e)break;for(;i.sibling===null;){if(i.return===null||i.return===e)return!0;i=i.return}i.sibling.return=i.return,i=i.sibling}}return!0}function Fa(e,i,a,o){i&=~Hf,i&=~Ss,e.suspendedLanes|=i,e.pingedLanes&=~i,o&&(e.warmLanes|=i),o=e.expirationTimes;for(var u=i;0<u;){var h=31-Kt(u),v=1<<h;o[h]=-1,u&=~v}a!==0&&ol(e,a,i)}function Kl(){return(ze&6)===0?(Ro(0),!1):!0}function Wf(){if(Se!==null){if(Fe===0)var e=Se.return;else e=Se,Zi=hs=null,of(e),Qs=null,lo=0,e=Se;for(;e!==null;)bm(e.alternate,e),e=e.return;Se=null}}function or(e,i){var a=e.timeoutHandle;a!==-1&&(e.timeoutHandle=-1,zy(a)),a=e.cancelPendingCommit,a!==null&&(e.cancelPendingCommit=null,a()),ra=0,Wf(),Ye=e,Se=a=Yi(e.current,null),be=i,Fe=0,ni=null,Oa=!1,ar=qt(e,i),If=!1,sr=ii=Hf=Ss=Pa=nn=0,Xn=To=null,Gf=!1,(i&8)!==0&&(i|=i&32);var o=e.entangledLanes;if(o!==0)for(e=e.entanglements,o&=i;0<o;){var u=31-Kt(o),h=1<<u;i|=e[u],o&=~h}return sa=i,gl(),a}function Ym(e,i){me=null,B.H=go,i===Ks||i===Tl?(i=c0(),Fe=3):i===ju?(i=c0(),Fe=4):Fe=i===bf?8:i!==null&&typeof i=="object"&&typeof i.then=="function"?6:1,ni=i,Se===null&&(nn=1,Il(e,ci(i,e.current)))}function jm(){var e=ti.current;return e===null?!0:(be&4194048)===be?di===null:(be&62914560)===be||(be&536870912)!==0?e===di:!1}function Zm(){var e=B.H;return B.H=go,e===null?go:e}function Km(){var e=B.A;return B.A=py,e}function Ql(){nn=4,Oa||(be&4194048)!==be&&ti.current!==null||(ar=!0),(Pa&134217727)===0&&(Ss&134217727)===0||Ye===null||Fa(Ye,be,ii,!1)}function qf(e,i,a){var o=ze;ze|=2;var u=Zm(),h=Km();(Ye!==e||be!==i)&&(Zl=null,or(e,i)),i=!1;var v=nn;t:do try{if(Fe!==0&&Se!==null){var T=Se,I=ni;switch(Fe){case 8:Wf(),v=6;break t;case 3:case 2:case 9:case 6:ti.current===null&&(i=!0);var $=Fe;if(Fe=0,ni=null,lr(e,T,I,$),a&&ar){v=0;break t}break;default:$=Fe,Fe=0,ni=null,lr(e,T,I,$)}}gy(),v=nn;break}catch(ht){Ym(e,ht)}while(!0);return i&&e.shellSuspendCounter++,Zi=hs=null,ze=o,B.H=u,B.A=h,Se===null&&(Ye=null,be=0,gl()),v}function gy(){for(;Se!==null;)Qm(Se)}function _y(e,i){var a=ze;ze|=2;var o=Zm(),u=Km();Ye!==e||be!==i?(Zl=null,jl=E()+500,or(e,i)):ar=qt(e,i);t:do try{if(Fe!==0&&Se!==null){i=Se;var h=ni;e:switch(Fe){case 1:Fe=0,ni=null,lr(e,i,h,1);break;case 2:case 9:if(o0(h)){Fe=0,ni=null,Jm(i);break}i=function(){Fe!==2&&Fe!==9||Ye!==e||(Fe=7),Ni(e)},h.then(i,i);break t;case 3:Fe=7;break t;case 4:Fe=5;break t;case 7:o0(h)?(Fe=0,ni=null,Jm(i)):(Fe=0,ni=null,lr(e,i,h,7));break;case 5:var v=null;switch(Se.tag){case 26:v=Se.memoizedState;case 5:case 27:var T=Se;if(v?Bx(v):T.stateNode.complete){Fe=0,ni=null;var I=T.sibling;if(I!==null)Se=I;else{var $=T.return;$!==null?(Se=$,Jl($)):Se=null}break e}}Fe=0,ni=null,lr(e,i,h,5);break;case 6:Fe=0,ni=null,lr(e,i,h,6);break;case 8:Wf(),nn=6;break t;default:throw Error(s(462))}}vy();break}catch(ht){Ym(e,ht)}while(!0);return Zi=hs=null,B.H=o,B.A=u,ze=a,Se!==null?0:(Ye=null,be=0,gl(),nn)}function vy(){for(;Se!==null&&!kt();)Qm(Se)}function Qm(e){var i=Sm(e.alternate,e,sa);e.memoizedProps=e.pendingProps,i===null?Jl(e):Se=i}function Jm(e){var i=e,a=i.alternate;switch(i.tag){case 15:case 0:i=mm(a,i,i.pendingProps,i.type,void 0,be);break;case 11:i=mm(a,i,i.pendingProps,i.type.render,i.ref,be);break;case 5:of(i);default:bm(a,i),i=Se=Kp(i,sa),i=Sm(a,i,sa)}e.memoizedProps=e.pendingProps,i===null?Jl(e):Se=i}function lr(e,i,a,o){Zi=hs=null,of(i),Qs=null,lo=0;var u=i.return;try{if(oy(e,u,i,a,be)){nn=1,Il(e,ci(a,e.current)),Se=null;return}}catch(h){if(u!==null)throw Se=u,h;nn=1,Il(e,ci(a,e.current)),Se=null;return}i.flags&32768?(Ce||o===1?e=!0:ar||(be&536870912)!==0?e=!1:(Oa=e=!0,(o===2||o===9||o===3||o===6)&&(o=ti.current,o!==null&&o.tag===13&&(o.flags|=16384))),$m(i,e)):Jl(i)}function Jl(e){var i=e;do{if((i.flags&32768)!==0){$m(i,Oa);return}e=i.return;var a=uy(i.alternate,i,sa);if(a!==null){Se=a;return}if(i=i.sibling,i!==null){Se=i;return}Se=i=e}while(i!==null);nn===0&&(nn=5)}function $m(e,i){do{var a=fy(e.alternate,e);if(a!==null){a.flags&=32767,Se=a;return}if(a=e.return,a!==null&&(a.flags|=32768,a.subtreeFlags=0,a.deletions=null),!i&&(e=e.sibling,e!==null)){Se=e;return}Se=e=a}while(e!==null);nn=6,Se=null}function tx(e,i,a,o,u,h,v,T,I){e.cancelPendingCommit=null;do $l();while(xn!==0);if((ze&6)!==0)throw Error(s(327));if(i!==null){if(i===e.current)throw Error(s(177));if(h=i.lanes|i.childLanes,h|=Nu,Kn(e,a,h,v,T,I),e===Ye&&(Se=Ye=null,be=0),rr=i,Ba=e,ra=a,Vf=h,kf=u,km=o,(i.subtreeFlags&10256)!==0||(i.flags&10256)!==0?(e.callbackNode=null,e.callbackPriority=0,by(ot,function(){return sx(),null})):(e.callbackNode=null,e.callbackPriority=0),o=(i.flags&13878)!==0,(i.subtreeFlags&13878)!==0||o){o=B.T,B.T=null,u=q.p,q.p=2,v=ze,ze|=4;try{hy(e,i,a)}finally{ze=v,q.p=u,B.T=o}}xn=1,ex(),nx(),ix()}}function ex(){if(xn===1){xn=0;var e=Ba,i=rr,a=(i.flags&13878)!==0;if((i.subtreeFlags&13878)!==0||a){a=B.T,B.T=null;var o=q.p;q.p=2;var u=ze;ze|=4;try{Pm(i,e);var h=ah,v=Gp(e.containerInfo),T=h.focusedElem,I=h.selectionRange;if(v!==T&&T&&T.ownerDocument&&Hp(T.ownerDocument.documentElement,T)){if(I!==null&&Cu(T)){var $=I.start,ht=I.end;if(ht===void 0&&(ht=$),"selectionStart"in T)T.selectionStart=$,T.selectionEnd=Math.min(ht,T.value.length);else{var mt=T.ownerDocument||document,et=mt&&mt.defaultView||window;if(et.getSelection){var rt=et.getSelection(),jt=T.textContent.length,re=Math.min(I.start,jt),ke=I.end===void 0?re:Math.min(I.end,jt);!rt.extend&&re>ke&&(v=ke,ke=re,re=v);var W=Ip(T,re),V=Ip(T,ke);if(W&&V&&(rt.rangeCount!==1||rt.anchorNode!==W.node||rt.anchorOffset!==W.offset||rt.focusNode!==V.node||rt.focusOffset!==V.offset)){var J=mt.createRange();J.setStart(W.node,W.offset),rt.removeAllRanges(),re>ke?(rt.addRange(J),rt.extend(V.node,V.offset)):(J.setEnd(V.node,V.offset),rt.addRange(J))}}}}for(mt=[],rt=T;rt=rt.parentNode;)rt.nodeType===1&&mt.push({element:rt,left:rt.scrollLeft,top:rt.scrollTop});for(typeof T.focus=="function"&&T.focus(),T=0;T<mt.length;T++){var dt=mt[T];dt.element.scrollLeft=dt.left,dt.element.scrollTop=dt.top}}fc=!!ih,ah=ih=null}finally{ze=u,q.p=o,B.T=a}}e.current=i,xn=2}}function nx(){if(xn===2){xn=0;var e=Ba,i=rr,a=(i.flags&8772)!==0;if((i.subtreeFlags&8772)!==0||a){a=B.T,B.T=null;var o=q.p;q.p=2;var u=ze;ze|=4;try{Dm(e,i.alternate,i)}finally{ze=u,q.p=o,B.T=a}}xn=3}}function ix(){if(xn===4||xn===3){xn=0,U();var e=Ba,i=rr,a=ra,o=km;(i.subtreeFlags&10256)!==0||(i.flags&10256)!==0?xn=5:(xn=0,rr=Ba=null,ax(e,e.pendingLanes));var u=e.pendingLanes;if(u===0&&(za=null),as(a),i=i.stateNode,At&&typeof At.onCommitFiberRoot=="function")try{At.onCommitFiberRoot(Mt,i,void 0,(i.current.flags&128)===128)}catch{}if(o!==null){i=B.T,u=q.p,q.p=2,B.T=null;try{for(var h=e.onRecoverableError,v=0;v<o.length;v++){var T=o[v];h(T.value,{componentStack:T.stack})}}finally{B.T=i,q.p=u}}(ra&3)!==0&&$l(),Ni(e),u=e.pendingLanes,(a&261930)!==0&&(u&42)!==0?e===Xf?Ao++:(Ao=0,Xf=e):Ao=0,Ro(0)}}function ax(e,i){(e.pooledCacheLanes&=i)===0&&(i=e.pooledCache,i!=null&&(e.pooledCache=null,ro(i)))}function $l(){return ex(),nx(),ix(),sx()}function sx(){if(xn!==5)return!1;var e=Ba,i=Vf;Vf=0;var a=as(ra),o=B.T,u=q.p;try{q.p=32>a?32:a,B.T=null,a=kf,kf=null;var h=Ba,v=ra;if(xn=0,rr=Ba=null,ra=0,(ze&6)!==0)throw Error(s(331));var T=ze;if(ze|=4,Hm(h.current),Bm(h,h.current,v,a),ze=T,Ro(0,!1),At&&typeof At.onPostCommitFiberRoot=="function")try{At.onPostCommitFiberRoot(Mt,h)}catch{}return!0}finally{q.p=u,B.T=o,ax(e,i)}}function rx(e,i,a){i=ci(a,i),i=Mf(e.stateNode,i,2),e=Da(e,i,2),e!==null&&(Ln(e,2),Ni(e))}function Ie(e,i,a){if(e.tag===3)rx(e,e,a);else for(;i!==null;){if(i.tag===3){rx(i,e,a);break}else if(i.tag===1){var o=i.stateNode;if(typeof i.type.getDerivedStateFromError=="function"||typeof o.componentDidCatch=="function"&&(za===null||!za.has(o))){e=ci(a,e),a=om(2),o=Da(i,a,2),o!==null&&(lm(a,o,i,e),Ln(o,2),Ni(o));break}}i=i.return}}function Yf(e,i,a){var o=e.pingCache;if(o===null){o=e.pingCache=new my;var u=new Set;o.set(i,u)}else u=o.get(i),u===void 0&&(u=new Set,o.set(i,u));u.has(a)||(If=!0,u.add(a),e=yy.bind(null,e,i,a),i.then(e,e))}function yy(e,i,a){var o=e.pingCache;o!==null&&o.delete(i),e.pingedLanes|=e.suspendedLanes&a,e.warmLanes&=~a,Ye===e&&(be&a)===a&&(nn===4||nn===3&&(be&62914560)===be&&300>E()-Yl?(ze&2)===0&&or(e,0):Hf|=a,sr===be&&(sr=0)),Ni(e)}function ox(e,i){i===0&&(i=He()),e=cs(e,i),e!==null&&(Ln(e,i),Ni(e))}function Sy(e){var i=e.memoizedState,a=0;i!==null&&(a=i.retryLane),ox(e,a)}function My(e,i){var a=0;switch(e.tag){case 31:case 13:var o=e.stateNode,u=e.memoizedState;u!==null&&(a=u.retryLane);break;case 19:o=e.stateNode;break;case 22:o=e.stateNode._retryCache;break;default:throw Error(s(314))}o!==null&&o.delete(i),ox(e,a)}function by(e,i){return Wt(e,i)}var tc=null,cr=null,jf=!1,ec=!1,Zf=!1,Ia=0;function Ni(e){e!==cr&&e.next===null&&(cr===null?tc=cr=e:cr=cr.next=e),ec=!0,jf||(jf=!0,Ty())}function Ro(e,i){if(!Zf&&ec){Zf=!0;do for(var a=!1,o=tc;o!==null;){if(e!==0){var u=o.pendingLanes;if(u===0)var h=0;else{var v=o.suspendedLanes,T=o.pingedLanes;h=(1<<31-Kt(42|e)+1)-1,h&=u&~(v&~T),h=h&201326741?h&201326741|1:h?h|2:0}h!==0&&(a=!0,fx(o,h))}else h=be,h=gt(o,o===Ye?h:0,o.cancelPendingCommit!==null||o.timeoutHandle!==-1),(h&3)===0||qt(o,h)||(a=!0,fx(o,h));o=o.next}while(a);Zf=!1}}function Ey(){lx()}function lx(){ec=jf=!1;var e=0;Ia!==0&&Py()&&(e=Ia);for(var i=E(),a=null,o=tc;o!==null;){var u=o.next,h=cx(o,i);h===0?(o.next=null,a===null?tc=u:a.next=u,u===null&&(cr=a)):(a=o,(e!==0||(h&3)!==0)&&(ec=!0)),o=u}xn!==0&&xn!==5||Ro(e),Ia!==0&&(Ia=0)}function cx(e,i){for(var a=e.suspendedLanes,o=e.pingedLanes,u=e.expirationTimes,h=e.pendingLanes&-62914561;0<h;){var v=31-Kt(h),T=1<<v,I=u[v];I===-1?((T&a)===0||(T&o)!==0)&&(u[v]=ue(T,i)):I<=i&&(e.expiredLanes|=T),h&=~T}if(i=Ye,a=be,a=gt(e,e===i?a:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),o=e.callbackNode,a===0||e===i&&(Fe===2||Fe===9)||e.cancelPendingCommit!==null)return o!==null&&o!==null&&Pt(o),e.callbackNode=null,e.callbackPriority=0;if((a&3)===0||qt(e,a)){if(i=a&-a,i===e.callbackPriority)return i;switch(o!==null&&Pt(o),as(a)){case 2:case 8:a=St;break;case 32:a=ot;break;case 268435456:a=zt;break;default:a=ot}return o=ux.bind(null,e),a=Wt(a,o),e.callbackPriority=i,e.callbackNode=a,i}return o!==null&&o!==null&&Pt(o),e.callbackPriority=2,e.callbackNode=null,2}function ux(e,i){if(xn!==0&&xn!==5)return e.callbackNode=null,e.callbackPriority=0,null;var a=e.callbackNode;if($l()&&e.callbackNode!==a)return null;var o=be;return o=gt(e,e===Ye?o:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),o===0?null:(Wm(e,o,i),cx(e,E()),e.callbackNode!=null&&e.callbackNode===a?ux.bind(null,e):null)}function fx(e,i){if($l())return null;Wm(e,i,!0)}function Ty(){By(function(){(ze&6)!==0?Wt(ft,Ey):lx()})}function Kf(){if(Ia===0){var e=js;e===0&&(e=Bt,Bt<<=1,(Bt&261888)===0&&(Bt=256)),Ia=e}return Ia}function hx(e){return e==null||typeof e=="symbol"||typeof e=="boolean"?null:typeof e=="function"?e:cl(""+e)}function dx(e,i){var a=i.ownerDocument.createElement("input");return a.name=i.name,a.value=i.value,e.id&&a.setAttribute("form",e.id),i.parentNode.insertBefore(a,i),e=new FormData(e),a.parentNode.removeChild(a),e}function Ay(e,i,a,o,u){if(i==="submit"&&a&&a.stateNode===u){var h=hx((u[pn]||null).action),v=o.submitter;v&&(i=(i=v[pn]||null)?hx(i.formAction):v.getAttribute("formAction"),i!==null&&(h=i,v=null));var T=new dl("action","action",null,o,u);e.push({event:T,listeners:[{instance:null,listener:function(){if(o.defaultPrevented){if(Ia!==0){var I=v?dx(u,v):new FormData(u);xf(a,{pending:!0,data:I,method:u.method,action:h},null,I)}}else typeof h=="function"&&(T.preventDefault(),I=v?dx(u,v):new FormData(u),xf(a,{pending:!0,data:I,method:u.method,action:h},h,I))},currentTarget:u}]})}}for(var Qf=0;Qf<Lu.length;Qf++){var Jf=Lu[Qf],Ry=Jf.toLowerCase(),Cy=Jf[0].toUpperCase()+Jf.slice(1);Mi(Ry,"on"+Cy)}Mi(Xp,"onAnimationEnd"),Mi(Wp,"onAnimationIteration"),Mi(qp,"onAnimationStart"),Mi("dblclick","onDoubleClick"),Mi("focusin","onFocus"),Mi("focusout","onBlur"),Mi(Xv,"onTransitionRun"),Mi(Wv,"onTransitionStart"),Mi(qv,"onTransitionCancel"),Mi(Yp,"onTransitionEnd"),Xt("onMouseEnter",["mouseout","mouseover"]),Xt("onMouseLeave",["mouseout","mouseover"]),Xt("onPointerEnter",["pointerout","pointerover"]),Xt("onPointerLeave",["pointerout","pointerover"]),Ft("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),Ft("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),Ft("onBeforeInput",["compositionend","keypress","textInput","paste"]),Ft("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),Ft("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),Ft("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Co="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),wy=new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Co));function px(e,i){i=(i&4)!==0;for(var a=0;a<e.length;a++){var o=e[a],u=o.event;o=o.listeners;t:{var h=void 0;if(i)for(var v=o.length-1;0<=v;v--){var T=o[v],I=T.instance,$=T.currentTarget;if(T=T.listener,I!==h&&u.isPropagationStopped())break t;h=T,u.currentTarget=$;try{h(u)}catch(ht){xl(ht)}u.currentTarget=null,h=I}else for(v=0;v<o.length;v++){if(T=o[v],I=T.instance,$=T.currentTarget,T=T.listener,I!==h&&u.isPropagationStopped())break t;h=T,u.currentTarget=$;try{h(u)}catch(ht){xl(ht)}u.currentTarget=null,h=I}}}}function Me(e,i){var a=i[zs];a===void 0&&(a=i[zs]=new Set);var o=e+"__bubble";a.has(o)||(mx(i,e,2,!1),a.add(o))}function $f(e,i,a){var o=0;i&&(o|=4),mx(a,e,o,i)}var nc="_reactListening"+Math.random().toString(36).slice(2);function th(e){if(!e[nc]){e[nc]=!0,Z.forEach(function(a){a!=="selectionchange"&&(wy.has(a)||$f(a,!1,e),$f(a,!0,e))});var i=e.nodeType===9?e:e.ownerDocument;i===null||i[nc]||(i[nc]=!0,$f("selectionchange",!1,i))}}function mx(e,i,a,o){switch(Xx(i)){case 2:var u=iS;break;case 8:u=aS;break;default:u=mh}a=u.bind(null,i,a,e),u=void 0,!vu||i!=="touchstart"&&i!=="touchmove"&&i!=="wheel"||(u=!0),o?u!==void 0?e.addEventListener(i,a,{capture:!0,passive:u}):e.addEventListener(i,a,!0):u!==void 0?e.addEventListener(i,a,{passive:u}):e.addEventListener(i,a,!1)}function eh(e,i,a,o,u){var h=o;if((i&1)===0&&(i&2)===0&&o!==null)t:for(;;){if(o===null)return;var v=o.tag;if(v===3||v===4){var T=o.stateNode.containerInfo;if(T===u)break;if(v===4)for(v=o.return;v!==null;){var I=v.tag;if((I===3||I===4)&&v.stateNode.containerInfo===u)return;v=v.return}for(;T!==null;){if(v=Sa(T),v===null)return;if(I=v.tag,I===5||I===6||I===26||I===27){o=h=v;continue t}T=T.parentNode}}o=o.return}yp(function(){var $=h,ht=gu(a),mt=[];t:{var et=jp.get(e);if(et!==void 0){var rt=dl,jt=e;switch(e){case"keypress":if(fl(a)===0)break t;case"keydown":case"keyup":rt=Mv;break;case"focusin":jt="focus",rt=bu;break;case"focusout":jt="blur",rt=bu;break;case"beforeblur":case"afterblur":rt=bu;break;case"click":if(a.button===2)break t;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":rt=bp;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":rt=uv;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":rt=Tv;break;case Xp:case Wp:case qp:rt=dv;break;case Yp:rt=Rv;break;case"scroll":case"scrollend":rt=lv;break;case"wheel":rt=wv;break;case"copy":case"cut":case"paste":rt=mv;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":rt=Tp;break;case"toggle":case"beforetoggle":rt=Uv}var re=(i&4)!==0,ke=!re&&(e==="scroll"||e==="scrollend"),W=re?et!==null?et+"Capture":null:et;re=[];for(var V=$,J;V!==null;){var dt=V;if(J=dt.stateNode,dt=dt.tag,dt!==5&&dt!==26&&dt!==27||J===null||W===null||(dt=Zr(V,W),dt!=null&&re.push(wo(V,dt,J))),ke)break;V=V.return}0<re.length&&(et=new rt(et,jt,null,a,ht),mt.push({event:et,listeners:re}))}}if((i&7)===0){t:{if(et=e==="mouseover"||e==="pointerover",rt=e==="mouseout"||e==="pointerout",et&&a!==xu&&(jt=a.relatedTarget||a.fromElement)&&(Sa(jt)||jt[Vi]))break t;if((rt||et)&&(et=ht.window===ht?ht:(et=ht.ownerDocument)?et.defaultView||et.parentWindow:window,rt?(jt=a.relatedTarget||a.toElement,rt=$,jt=jt?Sa(jt):null,jt!==null&&(ke=c(jt),re=jt.tag,jt!==ke||re!==5&&re!==27&&re!==6)&&(jt=null)):(rt=null,jt=$),rt!==jt)){if(re=bp,dt="onMouseLeave",W="onMouseEnter",V="mouse",(e==="pointerout"||e==="pointerover")&&(re=Tp,dt="onPointerLeave",W="onPointerEnter",V="pointer"),ke=rt==null?et:X(rt),J=jt==null?et:X(jt),et=new re(dt,V+"leave",rt,a,ht),et.target=ke,et.relatedTarget=J,dt=null,Sa(ht)===$&&(re=new re(W,V+"enter",jt,a,ht),re.target=J,re.relatedTarget=ke,dt=re),ke=dt,rt&&jt)e:{for(re=Dy,W=rt,V=jt,J=0,dt=W;dt;dt=re(dt))J++;dt=0;for(var ie=V;ie;ie=re(ie))dt++;for(;0<J-dt;)W=re(W),J--;for(;0<dt-J;)V=re(V),dt--;for(;J--;){if(W===V||V!==null&&W===V.alternate){re=W;break e}W=re(W),V=re(V)}re=null}else re=null;rt!==null&&xx(mt,et,rt,re,!1),jt!==null&&ke!==null&&xx(mt,ke,jt,re,!0)}}t:{if(et=$?X($):window,rt=et.nodeName&&et.nodeName.toLowerCase(),rt==="select"||rt==="input"&&et.type==="file")var Le=Np;else if(Up(et))if(Op)Le=Gv;else{Le=Iv;var Jt=Fv}else rt=et.nodeName,!rt||rt.toLowerCase()!=="input"||et.type!=="checkbox"&&et.type!=="radio"?$&&mu($.elementType)&&(Le=Np):Le=Hv;if(Le&&(Le=Le(e,$))){Lp(mt,Le,a,ht);break t}Jt&&Jt(e,et,$),e==="focusout"&&$&&et.type==="number"&&$.memoizedProps.value!=null&&Sn(et,"number",et.value)}switch(Jt=$?X($):window,e){case"focusin":(Up(Jt)||Jt.contentEditable==="true")&&(Hs=Jt,wu=$,io=null);break;case"focusout":io=wu=Hs=null;break;case"mousedown":Du=!0;break;case"contextmenu":case"mouseup":case"dragend":Du=!1,Vp(mt,a,ht);break;case"selectionchange":if(kv)break;case"keydown":case"keyup":Vp(mt,a,ht)}var ge;if(Tu)t:{switch(e){case"compositionstart":var Ee="onCompositionStart";break t;case"compositionend":Ee="onCompositionEnd";break t;case"compositionupdate":Ee="onCompositionUpdate";break t}Ee=void 0}else Is?wp(e,a)&&(Ee="onCompositionEnd"):e==="keydown"&&a.keyCode===229&&(Ee="onCompositionStart");Ee&&(Ap&&a.locale!=="ko"&&(Is||Ee!=="onCompositionStart"?Ee==="onCompositionEnd"&&Is&&(ge=Sp()):(ba=ht,yu="value"in ba?ba.value:ba.textContent,Is=!0)),Jt=ic($,Ee),0<Jt.length&&(Ee=new Ep(Ee,e,null,a,ht),mt.push({event:Ee,listeners:Jt}),ge?Ee.data=ge:(ge=Dp(a),ge!==null&&(Ee.data=ge)))),(ge=Nv?Ov(e,a):Pv(e,a))&&(Ee=ic($,"onBeforeInput"),0<Ee.length&&(Jt=new Ep("onBeforeInput","beforeinput",null,a,ht),mt.push({event:Jt,listeners:Ee}),Jt.data=ge)),Ay(mt,e,$,a,ht)}px(mt,i)})}function wo(e,i,a){return{instance:e,listener:i,currentTarget:a}}function ic(e,i){for(var a=i+"Capture",o=[];e!==null;){var u=e,h=u.stateNode;if(u=u.tag,u!==5&&u!==26&&u!==27||h===null||(u=Zr(e,a),u!=null&&o.unshift(wo(e,u,h)),u=Zr(e,i),u!=null&&o.push(wo(e,u,h))),e.tag===3)return o;e=e.return}return[]}function Dy(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5&&e.tag!==27);return e||null}function xx(e,i,a,o,u){for(var h=i._reactName,v=[];a!==null&&a!==o;){var T=a,I=T.alternate,$=T.stateNode;if(T=T.tag,I!==null&&I===o)break;T!==5&&T!==26&&T!==27||$===null||(I=$,u?($=Zr(a,h),$!=null&&v.unshift(wo(a,$,I))):u||($=Zr(a,h),$!=null&&v.push(wo(a,$,I)))),a=a.return}v.length!==0&&e.push({event:i,listeners:v})}var Uy=/\r\n?/g,Ly=/\u0000|\uFFFD/g;function gx(e){return(typeof e=="string"?e:""+e).replace(Uy,`
`).replace(Ly,"")}function _x(e,i){return i=gx(i),gx(e)===i}function Ve(e,i,a,o,u,h){switch(a){case"children":typeof o=="string"?i==="body"||i==="textarea"&&o===""||wi(e,o):(typeof o=="number"||typeof o=="bigint")&&i!=="body"&&wi(e,""+o);break;case"className":we(e,"class",o);break;case"tabIndex":we(e,"tabindex",o);break;case"dir":case"role":case"viewBox":case"width":case"height":we(e,a,o);break;case"style":_p(e,o,h);break;case"data":if(i!=="object"){we(e,"data",o);break}case"src":case"href":if(o===""&&(i!=="a"||a!=="href")){e.removeAttribute(a);break}if(o==null||typeof o=="function"||typeof o=="symbol"||typeof o=="boolean"){e.removeAttribute(a);break}o=cl(""+o),e.setAttribute(a,o);break;case"action":case"formAction":if(typeof o=="function"){e.setAttribute(a,"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");break}else typeof h=="function"&&(a==="formAction"?(i!=="input"&&Ve(e,i,"name",u.name,u,null),Ve(e,i,"formEncType",u.formEncType,u,null),Ve(e,i,"formMethod",u.formMethod,u,null),Ve(e,i,"formTarget",u.formTarget,u,null)):(Ve(e,i,"encType",u.encType,u,null),Ve(e,i,"method",u.method,u,null),Ve(e,i,"target",u.target,u,null)));if(o==null||typeof o=="symbol"||typeof o=="boolean"){e.removeAttribute(a);break}o=cl(""+o),e.setAttribute(a,o);break;case"onClick":o!=null&&(e.onclick=Wi);break;case"onScroll":o!=null&&Me("scroll",e);break;case"onScrollEnd":o!=null&&Me("scrollend",e);break;case"dangerouslySetInnerHTML":if(o!=null){if(typeof o!="object"||!("__html"in o))throw Error(s(61));if(a=o.__html,a!=null){if(u.children!=null)throw Error(s(60));e.innerHTML=a}}break;case"multiple":e.multiple=o&&typeof o!="function"&&typeof o!="symbol";break;case"muted":e.muted=o&&typeof o!="function"&&typeof o!="symbol";break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":break;case"autoFocus":break;case"xlinkHref":if(o==null||typeof o=="function"||typeof o=="boolean"||typeof o=="symbol"){e.removeAttribute("xlink:href");break}a=cl(""+o),e.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",a);break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":o!=null&&typeof o!="function"&&typeof o!="symbol"?e.setAttribute(a,""+o):e.removeAttribute(a);break;case"inert":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":o&&typeof o!="function"&&typeof o!="symbol"?e.setAttribute(a,""):e.removeAttribute(a);break;case"capture":case"download":o===!0?e.setAttribute(a,""):o!==!1&&o!=null&&typeof o!="function"&&typeof o!="symbol"?e.setAttribute(a,o):e.removeAttribute(a);break;case"cols":case"rows":case"size":case"span":o!=null&&typeof o!="function"&&typeof o!="symbol"&&!isNaN(o)&&1<=o?e.setAttribute(a,o):e.removeAttribute(a);break;case"rowSpan":case"start":o==null||typeof o=="function"||typeof o=="symbol"||isNaN(o)?e.removeAttribute(a):e.setAttribute(a,o);break;case"popover":Me("beforetoggle",e),Me("toggle",e),xe(e,"popover",o);break;case"xlinkActuate":Ue(e,"http://www.w3.org/1999/xlink","xlink:actuate",o);break;case"xlinkArcrole":Ue(e,"http://www.w3.org/1999/xlink","xlink:arcrole",o);break;case"xlinkRole":Ue(e,"http://www.w3.org/1999/xlink","xlink:role",o);break;case"xlinkShow":Ue(e,"http://www.w3.org/1999/xlink","xlink:show",o);break;case"xlinkTitle":Ue(e,"http://www.w3.org/1999/xlink","xlink:title",o);break;case"xlinkType":Ue(e,"http://www.w3.org/1999/xlink","xlink:type",o);break;case"xmlBase":Ue(e,"http://www.w3.org/XML/1998/namespace","xml:base",o);break;case"xmlLang":Ue(e,"http://www.w3.org/XML/1998/namespace","xml:lang",o);break;case"xmlSpace":Ue(e,"http://www.w3.org/XML/1998/namespace","xml:space",o);break;case"is":xe(e,"is",o);break;case"innerText":case"textContent":break;default:(!(2<a.length)||a[0]!=="o"&&a[0]!=="O"||a[1]!=="n"&&a[1]!=="N")&&(a=rv.get(a)||a,xe(e,a,o))}}function nh(e,i,a,o,u,h){switch(a){case"style":_p(e,o,h);break;case"dangerouslySetInnerHTML":if(o!=null){if(typeof o!="object"||!("__html"in o))throw Error(s(61));if(a=o.__html,a!=null){if(u.children!=null)throw Error(s(60));e.innerHTML=a}}break;case"children":typeof o=="string"?wi(e,o):(typeof o=="number"||typeof o=="bigint")&&wi(e,""+o);break;case"onScroll":o!=null&&Me("scroll",e);break;case"onScrollEnd":o!=null&&Me("scrollend",e);break;case"onClick":o!=null&&(e.onclick=Wi);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"innerHTML":case"ref":break;case"innerText":case"textContent":break;default:if(!wt.hasOwnProperty(a))t:{if(a[0]==="o"&&a[1]==="n"&&(u=a.endsWith("Capture"),i=a.slice(2,u?a.length-7:void 0),h=e[pn]||null,h=h!=null?h[a]:null,typeof h=="function"&&e.removeEventListener(i,h,u),typeof o=="function")){typeof h!="function"&&h!==null&&(a in e?e[a]=null:e.hasAttribute(a)&&e.removeAttribute(a)),e.addEventListener(i,o,u);break t}a in e?e[a]=o:o===!0?e.setAttribute(a,""):xe(e,a,o)}}}function Dn(e,i,a){switch(i){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"img":Me("error",e),Me("load",e);var o=!1,u=!1,h;for(h in a)if(a.hasOwnProperty(h)){var v=a[h];if(v!=null)switch(h){case"src":o=!0;break;case"srcSet":u=!0;break;case"children":case"dangerouslySetInnerHTML":throw Error(s(137,i));default:Ve(e,i,h,v,a,null)}}u&&Ve(e,i,"srcSet",a.srcSet,a,null),o&&Ve(e,i,"src",a.src,a,null);return;case"input":Me("invalid",e);var T=h=v=u=null,I=null,$=null;for(o in a)if(a.hasOwnProperty(o)){var ht=a[o];if(ht!=null)switch(o){case"name":u=ht;break;case"type":v=ht;break;case"checked":I=ht;break;case"defaultChecked":$=ht;break;case"value":h=ht;break;case"defaultValue":T=ht;break;case"children":case"dangerouslySetInnerHTML":if(ht!=null)throw Error(s(137,i));break;default:Ve(e,i,o,ht,a,null)}}Ze(e,h,T,I,$,v,u,!1);return;case"select":Me("invalid",e),o=v=h=null;for(u in a)if(a.hasOwnProperty(u)&&(T=a[u],T!=null))switch(u){case"value":h=T;break;case"defaultValue":v=T;break;case"multiple":o=T;default:Ve(e,i,u,T,a,null)}i=h,a=v,e.multiple=!!o,i!=null?mn(e,!!o,i,!1):a!=null&&mn(e,!!o,a,!0);return;case"textarea":Me("invalid",e),h=u=o=null;for(v in a)if(a.hasOwnProperty(v)&&(T=a[v],T!=null))switch(v){case"value":o=T;break;case"defaultValue":u=T;break;case"children":h=T;break;case"dangerouslySetInnerHTML":if(T!=null)throw Error(s(91));break;default:Ve(e,i,v,T,a,null)}An(e,o,u,h);return;case"option":for(I in a)a.hasOwnProperty(I)&&(o=a[I],o!=null)&&(I==="selected"?e.selected=o&&typeof o!="function"&&typeof o!="symbol":Ve(e,i,I,o,a,null));return;case"dialog":Me("beforetoggle",e),Me("toggle",e),Me("cancel",e),Me("close",e);break;case"iframe":case"object":Me("load",e);break;case"video":case"audio":for(o=0;o<Co.length;o++)Me(Co[o],e);break;case"image":Me("error",e),Me("load",e);break;case"details":Me("toggle",e);break;case"embed":case"source":case"link":Me("error",e),Me("load",e);case"area":case"base":case"br":case"col":case"hr":case"keygen":case"meta":case"param":case"track":case"wbr":case"menuitem":for($ in a)if(a.hasOwnProperty($)&&(o=a[$],o!=null))switch($){case"children":case"dangerouslySetInnerHTML":throw Error(s(137,i));default:Ve(e,i,$,o,a,null)}return;default:if(mu(i)){for(ht in a)a.hasOwnProperty(ht)&&(o=a[ht],o!==void 0&&nh(e,i,ht,o,a,void 0));return}}for(T in a)a.hasOwnProperty(T)&&(o=a[T],o!=null&&Ve(e,i,T,o,a,null))}function Ny(e,i,a,o){switch(i){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"input":var u=null,h=null,v=null,T=null,I=null,$=null,ht=null;for(rt in a){var mt=a[rt];if(a.hasOwnProperty(rt)&&mt!=null)switch(rt){case"checked":break;case"value":break;case"defaultValue":I=mt;default:o.hasOwnProperty(rt)||Ve(e,i,rt,null,o,mt)}}for(var et in o){var rt=o[et];if(mt=a[et],o.hasOwnProperty(et)&&(rt!=null||mt!=null))switch(et){case"type":h=rt;break;case"name":u=rt;break;case"checked":$=rt;break;case"defaultChecked":ht=rt;break;case"value":v=rt;break;case"defaultValue":T=rt;break;case"children":case"dangerouslySetInnerHTML":if(rt!=null)throw Error(s(137,i));break;default:rt!==mt&&Ve(e,i,et,rt,o,mt)}}ki(e,v,T,I,$,ht,h,u);return;case"select":rt=v=T=et=null;for(h in a)if(I=a[h],a.hasOwnProperty(h)&&I!=null)switch(h){case"value":break;case"multiple":rt=I;default:o.hasOwnProperty(h)||Ve(e,i,h,null,o,I)}for(u in o)if(h=o[u],I=a[u],o.hasOwnProperty(u)&&(h!=null||I!=null))switch(u){case"value":et=h;break;case"defaultValue":T=h;break;case"multiple":v=h;default:h!==I&&Ve(e,i,u,h,o,I)}i=T,a=v,o=rt,et!=null?mn(e,!!a,et,!1):!!o!=!!a&&(i!=null?mn(e,!!a,i,!0):mn(e,!!a,a?[]:"",!1));return;case"textarea":rt=et=null;for(T in a)if(u=a[T],a.hasOwnProperty(T)&&u!=null&&!o.hasOwnProperty(T))switch(T){case"value":break;case"children":break;default:Ve(e,i,T,null,o,u)}for(v in o)if(u=o[v],h=a[v],o.hasOwnProperty(v)&&(u!=null||h!=null))switch(v){case"value":et=u;break;case"defaultValue":rt=u;break;case"children":break;case"dangerouslySetInnerHTML":if(u!=null)throw Error(s(91));break;default:u!==h&&Ve(e,i,v,u,o,h)}Mn(e,et,rt);return;case"option":for(var jt in a)et=a[jt],a.hasOwnProperty(jt)&&et!=null&&!o.hasOwnProperty(jt)&&(jt==="selected"?e.selected=!1:Ve(e,i,jt,null,o,et));for(I in o)et=o[I],rt=a[I],o.hasOwnProperty(I)&&et!==rt&&(et!=null||rt!=null)&&(I==="selected"?e.selected=et&&typeof et!="function"&&typeof et!="symbol":Ve(e,i,I,et,o,rt));return;case"img":case"link":case"area":case"base":case"br":case"col":case"embed":case"hr":case"keygen":case"meta":case"param":case"source":case"track":case"wbr":case"menuitem":for(var re in a)et=a[re],a.hasOwnProperty(re)&&et!=null&&!o.hasOwnProperty(re)&&Ve(e,i,re,null,o,et);for($ in o)if(et=o[$],rt=a[$],o.hasOwnProperty($)&&et!==rt&&(et!=null||rt!=null))switch($){case"children":case"dangerouslySetInnerHTML":if(et!=null)throw Error(s(137,i));break;default:Ve(e,i,$,et,o,rt)}return;default:if(mu(i)){for(var ke in a)et=a[ke],a.hasOwnProperty(ke)&&et!==void 0&&!o.hasOwnProperty(ke)&&nh(e,i,ke,void 0,o,et);for(ht in o)et=o[ht],rt=a[ht],!o.hasOwnProperty(ht)||et===rt||et===void 0&&rt===void 0||nh(e,i,ht,et,o,rt);return}}for(var W in a)et=a[W],a.hasOwnProperty(W)&&et!=null&&!o.hasOwnProperty(W)&&Ve(e,i,W,null,o,et);for(mt in o)et=o[mt],rt=a[mt],!o.hasOwnProperty(mt)||et===rt||et==null&&rt==null||Ve(e,i,mt,et,o,rt)}function vx(e){switch(e){case"css":case"script":case"font":case"img":case"image":case"input":case"link":return!0;default:return!1}}function Oy(){if(typeof performance.getEntriesByType=="function"){for(var e=0,i=0,a=performance.getEntriesByType("resource"),o=0;o<a.length;o++){var u=a[o],h=u.transferSize,v=u.initiatorType,T=u.duration;if(h&&T&&vx(v)){for(v=0,T=u.responseEnd,o+=1;o<a.length;o++){var I=a[o],$=I.startTime;if($>T)break;var ht=I.transferSize,mt=I.initiatorType;ht&&vx(mt)&&(I=I.responseEnd,v+=ht*(I<T?1:(T-$)/(I-$)))}if(--o,i+=8*(h+v)/(u.duration/1e3),e++,10<e)break}}if(0<e)return i/e/1e6}return navigator.connection&&(e=navigator.connection.downlink,typeof e=="number")?e:5}var ih=null,ah=null;function ac(e){return e.nodeType===9?e:e.ownerDocument}function yx(e){switch(e){case"http://www.w3.org/2000/svg":return 1;case"http://www.w3.org/1998/Math/MathML":return 2;default:return 0}}function Sx(e,i){if(e===0)switch(i){case"svg":return 1;case"math":return 2;default:return 0}return e===1&&i==="foreignObject"?0:e}function sh(e,i){return e==="textarea"||e==="noscript"||typeof i.children=="string"||typeof i.children=="number"||typeof i.children=="bigint"||typeof i.dangerouslySetInnerHTML=="object"&&i.dangerouslySetInnerHTML!==null&&i.dangerouslySetInnerHTML.__html!=null}var rh=null;function Py(){var e=window.event;return e&&e.type==="popstate"?e===rh?!1:(rh=e,!0):(rh=null,!1)}var Mx=typeof setTimeout=="function"?setTimeout:void 0,zy=typeof clearTimeout=="function"?clearTimeout:void 0,bx=typeof Promise=="function"?Promise:void 0,By=typeof queueMicrotask=="function"?queueMicrotask:typeof bx<"u"?function(e){return bx.resolve(null).then(e).catch(Fy)}:Mx;function Fy(e){setTimeout(function(){throw e})}function Ha(e){return e==="head"}function Ex(e,i){var a=i,o=0;do{var u=a.nextSibling;if(e.removeChild(a),u&&u.nodeType===8)if(a=u.data,a==="/$"||a==="/&"){if(o===0){e.removeChild(u),dr(i);return}o--}else if(a==="$"||a==="$?"||a==="$~"||a==="$!"||a==="&")o++;else if(a==="html")Do(e.ownerDocument.documentElement);else if(a==="head"){a=e.ownerDocument.head,Do(a);for(var h=a.firstChild;h;){var v=h.nextSibling,T=h.nodeName;h[ss]||T==="SCRIPT"||T==="STYLE"||T==="LINK"&&h.rel.toLowerCase()==="stylesheet"||a.removeChild(h),h=v}}else a==="body"&&Do(e.ownerDocument.body);a=u}while(a);dr(i)}function Tx(e,i){var a=e;e=0;do{var o=a.nextSibling;if(a.nodeType===1?i?(a._stashedDisplay=a.style.display,a.style.display="none"):(a.style.display=a._stashedDisplay||"",a.getAttribute("style")===""&&a.removeAttribute("style")):a.nodeType===3&&(i?(a._stashedText=a.nodeValue,a.nodeValue=""):a.nodeValue=a._stashedText||""),o&&o.nodeType===8)if(a=o.data,a==="/$"){if(e===0)break;e--}else a!=="$"&&a!=="$?"&&a!=="$~"&&a!=="$!"||e++;a=o}while(a)}function oh(e){var i=e.firstChild;for(i&&i.nodeType===10&&(i=i.nextSibling);i;){var a=i;switch(i=i.nextSibling,a.nodeName){case"HTML":case"HEAD":case"BODY":oh(a),jr(a);continue;case"SCRIPT":case"STYLE":continue;case"LINK":if(a.rel.toLowerCase()==="stylesheet")continue}e.removeChild(a)}}function Iy(e,i,a,o){for(;e.nodeType===1;){var u=a;if(e.nodeName.toLowerCase()!==i.toLowerCase()){if(!o&&(e.nodeName!=="INPUT"||e.type!=="hidden"))break}else if(o){if(!e[ss])switch(i){case"meta":if(!e.hasAttribute("itemprop"))break;return e;case"link":if(h=e.getAttribute("rel"),h==="stylesheet"&&e.hasAttribute("data-precedence"))break;if(h!==u.rel||e.getAttribute("href")!==(u.href==null||u.href===""?null:u.href)||e.getAttribute("crossorigin")!==(u.crossOrigin==null?null:u.crossOrigin)||e.getAttribute("title")!==(u.title==null?null:u.title))break;return e;case"style":if(e.hasAttribute("data-precedence"))break;return e;case"script":if(h=e.getAttribute("src"),(h!==(u.src==null?null:u.src)||e.getAttribute("type")!==(u.type==null?null:u.type)||e.getAttribute("crossorigin")!==(u.crossOrigin==null?null:u.crossOrigin))&&h&&e.hasAttribute("async")&&!e.hasAttribute("itemprop"))break;return e;default:return e}}else if(i==="input"&&e.type==="hidden"){var h=u.name==null?null:""+u.name;if(u.type==="hidden"&&e.getAttribute("name")===h)return e}else return e;if(e=pi(e.nextSibling),e===null)break}return null}function Hy(e,i,a){if(i==="")return null;for(;e.nodeType!==3;)if((e.nodeType!==1||e.nodeName!=="INPUT"||e.type!=="hidden")&&!a||(e=pi(e.nextSibling),e===null))return null;return e}function Ax(e,i){for(;e.nodeType!==8;)if((e.nodeType!==1||e.nodeName!=="INPUT"||e.type!=="hidden")&&!i||(e=pi(e.nextSibling),e===null))return null;return e}function lh(e){return e.data==="$?"||e.data==="$~"}function ch(e){return e.data==="$!"||e.data==="$?"&&e.ownerDocument.readyState!=="loading"}function Gy(e,i){var a=e.ownerDocument;if(e.data==="$~")e._reactRetry=i;else if(e.data!=="$?"||a.readyState!=="loading")i();else{var o=function(){i(),a.removeEventListener("DOMContentLoaded",o)};a.addEventListener("DOMContentLoaded",o),e._reactRetry=o}}function pi(e){for(;e!=null;e=e.nextSibling){var i=e.nodeType;if(i===1||i===3)break;if(i===8){if(i=e.data,i==="$"||i==="$!"||i==="$?"||i==="$~"||i==="&"||i==="F!"||i==="F")break;if(i==="/$"||i==="/&")return null}}return e}var uh=null;function Rx(e){e=e.nextSibling;for(var i=0;e;){if(e.nodeType===8){var a=e.data;if(a==="/$"||a==="/&"){if(i===0)return pi(e.nextSibling);i--}else a!=="$"&&a!=="$!"&&a!=="$?"&&a!=="$~"&&a!=="&"||i++}e=e.nextSibling}return null}function Cx(e){e=e.previousSibling;for(var i=0;e;){if(e.nodeType===8){var a=e.data;if(a==="$"||a==="$!"||a==="$?"||a==="$~"||a==="&"){if(i===0)return e;i--}else a!=="/$"&&a!=="/&"||i++}e=e.previousSibling}return null}function wx(e,i,a){switch(i=ac(a),e){case"html":if(e=i.documentElement,!e)throw Error(s(452));return e;case"head":if(e=i.head,!e)throw Error(s(453));return e;case"body":if(e=i.body,!e)throw Error(s(454));return e;default:throw Error(s(451))}}function Do(e){for(var i=e.attributes;i.length;)e.removeAttributeNode(i[0]);jr(e)}var mi=new Map,Dx=new Set;function sc(e){return typeof e.getRootNode=="function"?e.getRootNode():e.nodeType===9?e:e.ownerDocument}var oa=q.d;q.d={f:Vy,r:ky,D:Xy,C:Wy,L:qy,m:Yy,X:Zy,S:jy,M:Ky};function Vy(){var e=oa.f(),i=Kl();return e||i}function ky(e){var i=R(e);i!==null&&i.tag===5&&i.type==="form"?Y0(i):oa.r(e)}var ur=typeof document>"u"?null:document;function Ux(e,i,a){var o=ur;if(o&&typeof i=="string"&&i){var u=je(i);u='link[rel="'+e+'"][href="'+u+'"]',typeof a=="string"&&(u+='[crossorigin="'+a+'"]'),Dx.has(u)||(Dx.add(u),e={rel:e,crossOrigin:a,href:i},o.querySelector(u)===null&&(i=o.createElement("link"),Dn(i,"link",e),tt(i),o.head.appendChild(i)))}}function Xy(e){oa.D(e),Ux("dns-prefetch",e,null)}function Wy(e,i){oa.C(e,i),Ux("preconnect",e,i)}function qy(e,i,a){oa.L(e,i,a);var o=ur;if(o&&e&&i){var u='link[rel="preload"][as="'+je(i)+'"]';i==="image"&&a&&a.imageSrcSet?(u+='[imagesrcset="'+je(a.imageSrcSet)+'"]',typeof a.imageSizes=="string"&&(u+='[imagesizes="'+je(a.imageSizes)+'"]')):u+='[href="'+je(e)+'"]';var h=u;switch(i){case"style":h=fr(e);break;case"script":h=hr(e)}mi.has(h)||(e=g({rel:"preload",href:i==="image"&&a&&a.imageSrcSet?void 0:e,as:i},a),mi.set(h,e),o.querySelector(u)!==null||i==="style"&&o.querySelector(Uo(h))||i==="script"&&o.querySelector(Lo(h))||(i=o.createElement("link"),Dn(i,"link",e),tt(i),o.head.appendChild(i)))}}function Yy(e,i){oa.m(e,i);var a=ur;if(a&&e){var o=i&&typeof i.as=="string"?i.as:"script",u='link[rel="modulepreload"][as="'+je(o)+'"][href="'+je(e)+'"]',h=u;switch(o){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":h=hr(e)}if(!mi.has(h)&&(e=g({rel:"modulepreload",href:e},i),mi.set(h,e),a.querySelector(u)===null)){switch(o){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":if(a.querySelector(Lo(h)))return}o=a.createElement("link"),Dn(o,"link",e),tt(o),a.head.appendChild(o)}}}function jy(e,i,a){oa.S(e,i,a);var o=ur;if(o&&e){var u=st(o).hoistableStyles,h=fr(e);i=i||"default";var v=u.get(h);if(!v){var T={loading:0,preload:null};if(v=o.querySelector(Uo(h)))T.loading=5;else{e=g({rel:"stylesheet",href:e,"data-precedence":i},a),(a=mi.get(h))&&fh(e,a);var I=v=o.createElement("link");tt(I),Dn(I,"link",e),I._p=new Promise(function($,ht){I.onload=$,I.onerror=ht}),I.addEventListener("load",function(){T.loading|=1}),I.addEventListener("error",function(){T.loading|=2}),T.loading|=4,rc(v,i,o)}v={type:"stylesheet",instance:v,count:1,state:T},u.set(h,v)}}}function Zy(e,i){oa.X(e,i);var a=ur;if(a&&e){var o=st(a).hoistableScripts,u=hr(e),h=o.get(u);h||(h=a.querySelector(Lo(u)),h||(e=g({src:e,async:!0},i),(i=mi.get(u))&&hh(e,i),h=a.createElement("script"),tt(h),Dn(h,"link",e),a.head.appendChild(h)),h={type:"script",instance:h,count:1,state:null},o.set(u,h))}}function Ky(e,i){oa.M(e,i);var a=ur;if(a&&e){var o=st(a).hoistableScripts,u=hr(e),h=o.get(u);h||(h=a.querySelector(Lo(u)),h||(e=g({src:e,async:!0,type:"module"},i),(i=mi.get(u))&&hh(e,i),h=a.createElement("script"),tt(h),Dn(h,"link",e),a.head.appendChild(h)),h={type:"script",instance:h,count:1,state:null},o.set(u,h))}}function Lx(e,i,a,o){var u=(u=at.current)?sc(u):null;if(!u)throw Error(s(446));switch(e){case"meta":case"title":return null;case"style":return typeof a.precedence=="string"&&typeof a.href=="string"?(i=fr(a.href),a=st(u).hoistableStyles,o=a.get(i),o||(o={type:"style",instance:null,count:0,state:null},a.set(i,o)),o):{type:"void",instance:null,count:0,state:null};case"link":if(a.rel==="stylesheet"&&typeof a.href=="string"&&typeof a.precedence=="string"){e=fr(a.href);var h=st(u).hoistableStyles,v=h.get(e);if(v||(u=u.ownerDocument||u,v={type:"stylesheet",instance:null,count:0,state:{loading:0,preload:null}},h.set(e,v),(h=u.querySelector(Uo(e)))&&!h._p&&(v.instance=h,v.state.loading=5),mi.has(e)||(a={rel:"preload",as:"style",href:a.href,crossOrigin:a.crossOrigin,integrity:a.integrity,media:a.media,hrefLang:a.hrefLang,referrerPolicy:a.referrerPolicy},mi.set(e,a),h||Qy(u,e,a,v.state))),i&&o===null)throw Error(s(528,""));return v}if(i&&o!==null)throw Error(s(529,""));return null;case"script":return i=a.async,a=a.src,typeof a=="string"&&i&&typeof i!="function"&&typeof i!="symbol"?(i=hr(a),a=st(u).hoistableScripts,o=a.get(i),o||(o={type:"script",instance:null,count:0,state:null},a.set(i,o)),o):{type:"void",instance:null,count:0,state:null};default:throw Error(s(444,e))}}function fr(e){return'href="'+je(e)+'"'}function Uo(e){return'link[rel="stylesheet"]['+e+"]"}function Nx(e){return g({},e,{"data-precedence":e.precedence,precedence:null})}function Qy(e,i,a,o){e.querySelector('link[rel="preload"][as="style"]['+i+"]")?o.loading=1:(i=e.createElement("link"),o.preload=i,i.addEventListener("load",function(){return o.loading|=1}),i.addEventListener("error",function(){return o.loading|=2}),Dn(i,"link",a),tt(i),e.head.appendChild(i))}function hr(e){return'[src="'+je(e)+'"]'}function Lo(e){return"script[async]"+e}function Ox(e,i,a){if(i.count++,i.instance===null)switch(i.type){case"style":var o=e.querySelector('style[data-href~="'+je(a.href)+'"]');if(o)return i.instance=o,tt(o),o;var u=g({},a,{"data-href":a.href,"data-precedence":a.precedence,href:null,precedence:null});return o=(e.ownerDocument||e).createElement("style"),tt(o),Dn(o,"style",u),rc(o,a.precedence,e),i.instance=o;case"stylesheet":u=fr(a.href);var h=e.querySelector(Uo(u));if(h)return i.state.loading|=4,i.instance=h,tt(h),h;o=Nx(a),(u=mi.get(u))&&fh(o,u),h=(e.ownerDocument||e).createElement("link"),tt(h);var v=h;return v._p=new Promise(function(T,I){v.onload=T,v.onerror=I}),Dn(h,"link",o),i.state.loading|=4,rc(h,a.precedence,e),i.instance=h;case"script":return h=hr(a.src),(u=e.querySelector(Lo(h)))?(i.instance=u,tt(u),u):(o=a,(u=mi.get(h))&&(o=g({},a),hh(o,u)),e=e.ownerDocument||e,u=e.createElement("script"),tt(u),Dn(u,"link",o),e.head.appendChild(u),i.instance=u);case"void":return null;default:throw Error(s(443,i.type))}else i.type==="stylesheet"&&(i.state.loading&4)===0&&(o=i.instance,i.state.loading|=4,rc(o,a.precedence,e));return i.instance}function rc(e,i,a){for(var o=a.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'),u=o.length?o[o.length-1]:null,h=u,v=0;v<o.length;v++){var T=o[v];if(T.dataset.precedence===i)h=T;else if(h!==u)break}h?h.parentNode.insertBefore(e,h.nextSibling):(i=a.nodeType===9?a.head:a,i.insertBefore(e,i.firstChild))}function fh(e,i){e.crossOrigin==null&&(e.crossOrigin=i.crossOrigin),e.referrerPolicy==null&&(e.referrerPolicy=i.referrerPolicy),e.title==null&&(e.title=i.title)}function hh(e,i){e.crossOrigin==null&&(e.crossOrigin=i.crossOrigin),e.referrerPolicy==null&&(e.referrerPolicy=i.referrerPolicy),e.integrity==null&&(e.integrity=i.integrity)}var oc=null;function Px(e,i,a){if(oc===null){var o=new Map,u=oc=new Map;u.set(a,o)}else u=oc,o=u.get(a),o||(o=new Map,u.set(a,o));if(o.has(e))return o;for(o.set(e,null),a=a.getElementsByTagName(e),u=0;u<a.length;u++){var h=a[u];if(!(h[ss]||h[ln]||e==="link"&&h.getAttribute("rel")==="stylesheet")&&h.namespaceURI!=="http://www.w3.org/2000/svg"){var v=h.getAttribute(i)||"";v=e+v;var T=o.get(v);T?T.push(h):o.set(v,[h])}}return o}function zx(e,i,a){e=e.ownerDocument||e,e.head.insertBefore(a,i==="title"?e.querySelector("head > title"):null)}function Jy(e,i,a){if(a===1||i.itemProp!=null)return!1;switch(e){case"meta":case"title":return!0;case"style":if(typeof i.precedence!="string"||typeof i.href!="string"||i.href==="")break;return!0;case"link":if(typeof i.rel!="string"||typeof i.href!="string"||i.href===""||i.onLoad||i.onError)break;return i.rel==="stylesheet"?(e=i.disabled,typeof i.precedence=="string"&&e==null):!0;case"script":if(i.async&&typeof i.async!="function"&&typeof i.async!="symbol"&&!i.onLoad&&!i.onError&&i.src&&typeof i.src=="string")return!0}return!1}function Bx(e){return!(e.type==="stylesheet"&&(e.state.loading&3)===0)}function $y(e,i,a,o){if(a.type==="stylesheet"&&(typeof o.media!="string"||matchMedia(o.media).matches!==!1)&&(a.state.loading&4)===0){if(a.instance===null){var u=fr(o.href),h=i.querySelector(Uo(u));if(h){i=h._p,i!==null&&typeof i=="object"&&typeof i.then=="function"&&(e.count++,e=lc.bind(e),i.then(e,e)),a.state.loading|=4,a.instance=h,tt(h);return}h=i.ownerDocument||i,o=Nx(o),(u=mi.get(u))&&fh(o,u),h=h.createElement("link"),tt(h);var v=h;v._p=new Promise(function(T,I){v.onload=T,v.onerror=I}),Dn(h,"link",o),a.instance=h}e.stylesheets===null&&(e.stylesheets=new Map),e.stylesheets.set(a,i),(i=a.state.preload)&&(a.state.loading&3)===0&&(e.count++,a=lc.bind(e),i.addEventListener("load",a),i.addEventListener("error",a))}}var dh=0;function tS(e,i){return e.stylesheets&&e.count===0&&uc(e,e.stylesheets),0<e.count||0<e.imgCount?function(a){var o=setTimeout(function(){if(e.stylesheets&&uc(e,e.stylesheets),e.unsuspend){var h=e.unsuspend;e.unsuspend=null,h()}},6e4+i);0<e.imgBytes&&dh===0&&(dh=62500*Oy());var u=setTimeout(function(){if(e.waitingForImages=!1,e.count===0&&(e.stylesheets&&uc(e,e.stylesheets),e.unsuspend)){var h=e.unsuspend;e.unsuspend=null,h()}},(e.imgBytes>dh?50:800)+i);return e.unsuspend=a,function(){e.unsuspend=null,clearTimeout(o),clearTimeout(u)}}:null}function lc(){if(this.count--,this.count===0&&(this.imgCount===0||!this.waitingForImages)){if(this.stylesheets)uc(this,this.stylesheets);else if(this.unsuspend){var e=this.unsuspend;this.unsuspend=null,e()}}}var cc=null;function uc(e,i){e.stylesheets=null,e.unsuspend!==null&&(e.count++,cc=new Map,i.forEach(eS,e),cc=null,lc.call(e))}function eS(e,i){if(!(i.state.loading&4)){var a=cc.get(e);if(a)var o=a.get(null);else{a=new Map,cc.set(e,a);for(var u=e.querySelectorAll("link[data-precedence],style[data-precedence]"),h=0;h<u.length;h++){var v=u[h];(v.nodeName==="LINK"||v.getAttribute("media")!=="not all")&&(a.set(v.dataset.precedence,v),o=v)}o&&a.set(null,o)}u=i.instance,v=u.getAttribute("data-precedence"),h=a.get(v)||o,h===o&&a.set(null,u),a.set(v,u),this.count++,o=lc.bind(this),u.addEventListener("load",o),u.addEventListener("error",o),h?h.parentNode.insertBefore(u,h.nextSibling):(e=e.nodeType===9?e.head:e,e.insertBefore(u,e.firstChild)),i.state.loading|=4}}var No={$$typeof:w,Provider:null,Consumer:null,_currentValue:j,_currentValue2:j,_threadCount:0};function nS(e,i,a,o,u,h,v,T,I){this.tag=1,this.containerInfo=e,this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.next=this.pendingContext=this.context=this.cancelPendingCommit=null,this.callbackPriority=0,this.expirationTimes=De(-1),this.entangledLanes=this.shellSuspendCounter=this.errorRecoveryDisabledLanes=this.expiredLanes=this.warmLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=De(0),this.hiddenUpdates=De(null),this.identifierPrefix=o,this.onUncaughtError=u,this.onCaughtError=h,this.onRecoverableError=v,this.pooledCache=null,this.pooledCacheLanes=0,this.formState=I,this.incompleteTransitions=new Map}function Fx(e,i,a,o,u,h,v,T,I,$,ht,mt){return e=new nS(e,i,a,v,I,$,ht,mt,T),i=1,h===!0&&(i|=24),h=$n(3,null,null,i),e.current=h,h.stateNode=e,i=Wu(),i.refCount++,e.pooledCache=i,i.refCount++,h.memoizedState={element:o,isDehydrated:a,cache:i},Zu(h),e}function Ix(e){return e?(e=ks,e):ks}function Hx(e,i,a,o,u,h){u=Ix(u),o.context===null?o.context=u:o.pendingContext=u,o=wa(i),o.payload={element:a},h=h===void 0?null:h,h!==null&&(o.callback=h),a=Da(e,o,i),a!==null&&(Wn(a,e,i),uo(a,e,i))}function Gx(e,i){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var a=e.retryLane;e.retryLane=a!==0&&a<i?a:i}}function ph(e,i){Gx(e,i),(e=e.alternate)&&Gx(e,i)}function Vx(e){if(e.tag===13||e.tag===31){var i=cs(e,67108864);i!==null&&Wn(i,e,67108864),ph(e,67108864)}}function kx(e){if(e.tag===13||e.tag===31){var i=ai();i=Si(i);var a=cs(e,i);a!==null&&Wn(a,e,i),ph(e,i)}}var fc=!0;function iS(e,i,a,o){var u=B.T;B.T=null;var h=q.p;try{q.p=2,mh(e,i,a,o)}finally{q.p=h,B.T=u}}function aS(e,i,a,o){var u=B.T;B.T=null;var h=q.p;try{q.p=8,mh(e,i,a,o)}finally{q.p=h,B.T=u}}function mh(e,i,a,o){if(fc){var u=xh(o);if(u===null)eh(e,i,o,hc,a),Wx(e,o);else if(rS(u,e,i,a,o))o.stopPropagation();else if(Wx(e,o),i&4&&-1<sS.indexOf(e)){for(;u!==null;){var h=R(u);if(h!==null)switch(h.tag){case 3:if(h=h.stateNode,h.current.memoizedState.isDehydrated){var v=Et(h.pendingLanes);if(v!==0){var T=h;for(T.pendingLanes|=2,T.entangledLanes|=2;v;){var I=1<<31-Kt(v);T.entanglements[1]|=I,v&=~I}Ni(h),(ze&6)===0&&(jl=E()+500,Ro(0))}}break;case 31:case 13:T=cs(h,2),T!==null&&Wn(T,h,2),Kl(),ph(h,2)}if(h=xh(o),h===null&&eh(e,i,o,hc,a),h===u)break;u=h}u!==null&&o.stopPropagation()}else eh(e,i,o,null,a)}}function xh(e){return e=gu(e),gh(e)}var hc=null;function gh(e){if(hc=null,e=Sa(e),e!==null){var i=c(e);if(i===null)e=null;else{var a=i.tag;if(a===13){if(e=f(i),e!==null)return e;e=null}else if(a===31){if(e=d(i),e!==null)return e;e=null}else if(a===3){if(i.stateNode.current.memoizedState.isDehydrated)return i.tag===3?i.stateNode.containerInfo:null;e=null}else i!==e&&(e=null)}}return hc=e,null}function Xx(e){switch(e){case"beforetoggle":case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"toggle":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 2;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 8;case"message":switch(K()){case ft:return 2;case St:return 8;case ot:case $t:return 32;case zt:return 268435456;default:return 32}default:return 32}}var _h=!1,Ga=null,Va=null,ka=null,Oo=new Map,Po=new Map,Xa=[],sS="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");function Wx(e,i){switch(e){case"focusin":case"focusout":Ga=null;break;case"dragenter":case"dragleave":Va=null;break;case"mouseover":case"mouseout":ka=null;break;case"pointerover":case"pointerout":Oo.delete(i.pointerId);break;case"gotpointercapture":case"lostpointercapture":Po.delete(i.pointerId)}}function zo(e,i,a,o,u,h){return e===null||e.nativeEvent!==h?(e={blockedOn:i,domEventName:a,eventSystemFlags:o,nativeEvent:h,targetContainers:[u]},i!==null&&(i=R(i),i!==null&&Vx(i)),e):(e.eventSystemFlags|=o,i=e.targetContainers,u!==null&&i.indexOf(u)===-1&&i.push(u),e)}function rS(e,i,a,o,u){switch(i){case"focusin":return Ga=zo(Ga,e,i,a,o,u),!0;case"dragenter":return Va=zo(Va,e,i,a,o,u),!0;case"mouseover":return ka=zo(ka,e,i,a,o,u),!0;case"pointerover":var h=u.pointerId;return Oo.set(h,zo(Oo.get(h)||null,e,i,a,o,u)),!0;case"gotpointercapture":return h=u.pointerId,Po.set(h,zo(Po.get(h)||null,e,i,a,o,u)),!0}return!1}function qx(e){var i=Sa(e.target);if(i!==null){var a=c(i);if(a!==null){if(i=a.tag,i===13){if(i=f(a),i!==null){e.blockedOn=i,Yr(e.priority,function(){kx(a)});return}}else if(i===31){if(i=d(a),i!==null){e.blockedOn=i,Yr(e.priority,function(){kx(a)});return}}else if(i===3&&a.stateNode.current.memoizedState.isDehydrated){e.blockedOn=a.tag===3?a.stateNode.containerInfo:null;return}}}e.blockedOn=null}function dc(e){if(e.blockedOn!==null)return!1;for(var i=e.targetContainers;0<i.length;){var a=xh(e.nativeEvent);if(a===null){a=e.nativeEvent;var o=new a.constructor(a.type,a);xu=o,a.target.dispatchEvent(o),xu=null}else return i=R(a),i!==null&&Vx(i),e.blockedOn=a,!1;i.shift()}return!0}function Yx(e,i,a){dc(e)&&a.delete(i)}function oS(){_h=!1,Ga!==null&&dc(Ga)&&(Ga=null),Va!==null&&dc(Va)&&(Va=null),ka!==null&&dc(ka)&&(ka=null),Oo.forEach(Yx),Po.forEach(Yx)}function pc(e,i){e.blockedOn===i&&(e.blockedOn=null,_h||(_h=!0,r.unstable_scheduleCallback(r.unstable_NormalPriority,oS)))}var mc=null;function jx(e){mc!==e&&(mc=e,r.unstable_scheduleCallback(r.unstable_NormalPriority,function(){mc===e&&(mc=null);for(var i=0;i<e.length;i+=3){var a=e[i],o=e[i+1],u=e[i+2];if(typeof o!="function"){if(gh(o||a)===null)continue;break}var h=R(a);h!==null&&(e.splice(i,3),i-=3,xf(h,{pending:!0,data:u,method:a.method,action:o},o,u))}}))}function dr(e){function i(I){return pc(I,e)}Ga!==null&&pc(Ga,e),Va!==null&&pc(Va,e),ka!==null&&pc(ka,e),Oo.forEach(i),Po.forEach(i);for(var a=0;a<Xa.length;a++){var o=Xa[a];o.blockedOn===e&&(o.blockedOn=null)}for(;0<Xa.length&&(a=Xa[0],a.blockedOn===null);)qx(a),a.blockedOn===null&&Xa.shift();if(a=(e.ownerDocument||e).$$reactFormReplay,a!=null)for(o=0;o<a.length;o+=3){var u=a[o],h=a[o+1],v=u[pn]||null;if(typeof h=="function")v||jx(a);else if(v){var T=null;if(h&&h.hasAttribute("formAction")){if(u=h,v=h[pn]||null)T=v.formAction;else if(gh(u)!==null)continue}else T=v.action;typeof T=="function"?a[o+1]=T:(a.splice(o,3),o-=3),jx(a)}}}function Zx(){function e(h){h.canIntercept&&h.info==="react-transition"&&h.intercept({handler:function(){return new Promise(function(v){return u=v})},focusReset:"manual",scroll:"manual"})}function i(){u!==null&&(u(),u=null),o||setTimeout(a,20)}function a(){if(!o&&!navigation.transition){var h=navigation.currentEntry;h&&h.url!=null&&navigation.navigate(h.url,{state:h.getState(),info:"react-transition",history:"replace"})}}if(typeof navigation=="object"){var o=!1,u=null;return navigation.addEventListener("navigate",e),navigation.addEventListener("navigatesuccess",i),navigation.addEventListener("navigateerror",i),setTimeout(a,100),function(){o=!0,navigation.removeEventListener("navigate",e),navigation.removeEventListener("navigatesuccess",i),navigation.removeEventListener("navigateerror",i),u!==null&&(u(),u=null)}}}function vh(e){this._internalRoot=e}xc.prototype.render=vh.prototype.render=function(e){var i=this._internalRoot;if(i===null)throw Error(s(409));var a=i.current,o=ai();Hx(a,o,e,i,null,null)},xc.prototype.unmount=vh.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var i=e.containerInfo;Hx(e.current,2,null,e,null,null),Kl(),i[Vi]=null}};function xc(e){this._internalRoot=e}xc.prototype.unstable_scheduleHydration=function(e){if(e){var i=qr();e={blockedOn:null,target:e,priority:i};for(var a=0;a<Xa.length&&i!==0&&i<Xa[a].priority;a++);Xa.splice(a,0,e),a===0&&qx(e)}};var Kx=t.version;if(Kx!=="19.2.8")throw Error(s(527,Kx,"19.2.8"));q.findDOMNode=function(e){var i=e._reactInternals;if(i===void 0)throw typeof e.render=="function"?Error(s(188)):(e=Object.keys(e).join(","),Error(s(268,e)));return e=p(i),e=e!==null?x(e):null,e=e===null?null:e.stateNode,e};var lS={bundleType:0,version:"19.2.8",rendererPackageName:"react-dom",currentDispatcherRef:B,reconcilerVersion:"19.2.8"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var gc=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!gc.isDisabled&&gc.supportsFiber)try{Mt=gc.inject(lS),At=gc}catch{}}return Fo.createRoot=function(e,i){if(!l(e))throw Error(s(299));var a=!1,o="",u=im,h=am,v=sm;return i!=null&&(i.unstable_strictMode===!0&&(a=!0),i.identifierPrefix!==void 0&&(o=i.identifierPrefix),i.onUncaughtError!==void 0&&(u=i.onUncaughtError),i.onCaughtError!==void 0&&(h=i.onCaughtError),i.onRecoverableError!==void 0&&(v=i.onRecoverableError)),i=Fx(e,1,!1,null,null,a,o,null,u,h,v,Zx),e[Vi]=i.current,th(e),new vh(i)},Fo.hydrateRoot=function(e,i,a){if(!l(e))throw Error(s(299));var o=!1,u="",h=im,v=am,T=sm,I=null;return a!=null&&(a.unstable_strictMode===!0&&(o=!0),a.identifierPrefix!==void 0&&(u=a.identifierPrefix),a.onUncaughtError!==void 0&&(h=a.onUncaughtError),a.onCaughtError!==void 0&&(v=a.onCaughtError),a.onRecoverableError!==void 0&&(T=a.onRecoverableError),a.formState!==void 0&&(I=a.formState)),i=Fx(e,1,!0,i,a??null,o,u,I,h,v,T,Zx),i.context=Ix(null),a=i.current,o=ai(),o=Si(o),u=wa(o),u.callback=null,Da(a,u,o),a=o,i.current.lanes=a,Ln(i,a),Ni(i),e[Vi]=i.current,th(e),new xc(i)},Fo.version="19.2.8",Fo}var rg;function _S(){if(rg)return Mh.exports;rg=1;function r(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r)}catch(t){console.error(t)}}return r(),Mh.exports=gS(),Mh.exports}var vS=_S();const np="181",Dr={ROTATE:0,DOLLY:1,PAN:2},Cr={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},yS=0,og=1,SS=2,__=1,MS=2,pa=3,ns=0,jn=1,ma=2,_a=0,Ur=1,lg=2,cg=3,ug=4,bS=5,ws=100,ES=101,TS=102,AS=103,RS=104,CS=200,wS=201,DS=202,US=203,ld=204,cd=205,LS=206,NS=207,OS=208,PS=209,zS=210,BS=211,FS=212,IS=213,HS=214,ud=0,fd=1,hd=2,Nr=3,dd=4,pd=5,md=6,xd=7,v_=0,GS=1,VS=2,es=0,kS=1,XS=2,WS=3,qS=4,YS=5,jS=6,ZS=7,y_=300,Or=301,Pr=302,gd=303,_d=304,ru=306,vd=1e3,xa=1001,yd=1002,oi=1003,KS=1004,_c=1005,yi=1006,Ah=1007,Us=1008,Fi=1009,S_=1010,M_=1011,Jo=1012,ip=1013,Ls=1014,ga=1015,Ir=1016,ap=1017,sp=1018,$o=1020,b_=35902,E_=35899,T_=1021,A_=1022,Ci=1023,tl=1026,el=1027,R_=1028,rp=1029,op=1030,lp=1031,cp=1033,jc=33776,Zc=33777,Kc=33778,Qc=33779,Sd=35840,Md=35841,bd=35842,Ed=35843,Td=36196,Ad=37492,Rd=37496,Cd=37808,wd=37809,Dd=37810,Ud=37811,Ld=37812,Nd=37813,Od=37814,Pd=37815,zd=37816,Bd=37817,Fd=37818,Id=37819,Hd=37820,Gd=37821,Vd=36492,kd=36494,Xd=36495,Wd=36283,qd=36284,Yd=36285,jd=36286,QS=3200,JS=3201,C_=0,$S=1,$a="",gi="srgb",zr="srgb-linear",tu="linear",Xe="srgb",pr=7680,fg=519,tM=512,eM=513,nM=514,w_=515,iM=516,aM=517,sM=518,rM=519,hg=35044,dg="300 es",zi=2e3,eu=2001;function D_(r){for(let t=r.length-1;t>=0;--t)if(r[t]>=65535)return!0;return!1}function nu(r){return document.createElementNS("http://www.w3.org/1999/xhtml",r)}function oM(){const r=nu("canvas");return r.style.display="block",r}const pg={};function mg(...r){const t="THREE."+r.shift();console.log(t,...r)}function fe(...r){const t="THREE."+r.shift();console.warn(t,...r)}function an(...r){const t="THREE."+r.shift();console.error(t,...r)}function nl(...r){const t=r.join(" ");t in pg||(pg[t]=!0,fe(...r))}function lM(r,t,n){return new Promise(function(s,l){function c(){switch(r.clientWaitSync(t,r.SYNC_FLUSH_COMMANDS_BIT,0)){case r.WAIT_FAILED:l();break;case r.TIMEOUT_EXPIRED:setTimeout(c,n);break;default:s()}}setTimeout(c,n)})}class Ps{addEventListener(t,n){this._listeners===void 0&&(this._listeners={});const s=this._listeners;s[t]===void 0&&(s[t]=[]),s[t].indexOf(n)===-1&&s[t].push(n)}hasEventListener(t,n){const s=this._listeners;return s===void 0?!1:s[t]!==void 0&&s[t].indexOf(n)!==-1}removeEventListener(t,n){const s=this._listeners;if(s===void 0)return;const l=s[t];if(l!==void 0){const c=l.indexOf(n);c!==-1&&l.splice(c,1)}}dispatchEvent(t){const n=this._listeners;if(n===void 0)return;const s=n[t.type];if(s!==void 0){t.target=this;const l=s.slice(0);for(let c=0,f=l.length;c<f;c++)l[c].call(this,t);t.target=null}}}const On=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Zo=Math.PI/180,Zd=180/Math.PI;function Hr(){const r=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,s=Math.random()*4294967295|0;return(On[r&255]+On[r>>8&255]+On[r>>16&255]+On[r>>24&255]+"-"+On[t&255]+On[t>>8&255]+"-"+On[t>>16&15|64]+On[t>>24&255]+"-"+On[n&63|128]+On[n>>8&255]+"-"+On[n>>16&255]+On[n>>24&255]+On[s&255]+On[s>>8&255]+On[s>>16&255]+On[s>>24&255]).toLowerCase()}function ye(r,t,n){return Math.max(t,Math.min(n,r))}function cM(r,t){return(r%t+t)%t}function Rh(r,t,n){return(1-n)*r+n*t}function Io(r,t){switch(t.constructor){case Float32Array:return r;case Uint32Array:return r/4294967295;case Uint16Array:return r/65535;case Uint8Array:return r/255;case Int32Array:return Math.max(r/2147483647,-1);case Int16Array:return Math.max(r/32767,-1);case Int8Array:return Math.max(r/127,-1);default:throw new Error("Invalid component type.")}}function qn(r,t){switch(t.constructor){case Float32Array:return r;case Uint32Array:return Math.round(r*4294967295);case Uint16Array:return Math.round(r*65535);case Uint8Array:return Math.round(r*255);case Int32Array:return Math.round(r*2147483647);case Int16Array:return Math.round(r*32767);case Int8Array:return Math.round(r*127);default:throw new Error("Invalid component type.")}}const uM={DEG2RAD:Zo};class Nt{constructor(t=0,n=0){Nt.prototype.isVector2=!0,this.x=t,this.y=n}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,n){return this.x=t,this.y=n,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const n=this.x,s=this.y,l=t.elements;return this.x=l[0]*n+l[3]*s+l[6],this.y=l[1]*n+l[4]*s+l[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,n){return this.x=ye(this.x,t.x,n.x),this.y=ye(this.y,t.y,n.y),this}clampScalar(t,n){return this.x=ye(this.x,t,n),this.y=ye(this.y,t,n),this}clampLength(t,n){const s=this.length();return this.divideScalar(s||1).multiplyScalar(ye(s,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;const s=this.dot(t)/n;return Math.acos(ye(s,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const n=this.x-t.x,s=this.y-t.y;return n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this}lerpVectors(t,n,s){return this.x=t.x+(n.x-t.x)*s,this.y=t.y+(n.y-t.y)*s,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this}rotateAround(t,n){const s=Math.cos(n),l=Math.sin(n),c=this.x-t.x,f=this.y-t.y;return this.x=c*s-f*l+t.x,this.y=c*l+f*s+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class is{constructor(t=0,n=0,s=0,l=1){this.isQuaternion=!0,this._x=t,this._y=n,this._z=s,this._w=l}static slerpFlat(t,n,s,l,c,f,d){let m=s[l+0],p=s[l+1],x=s[l+2],g=s[l+3],_=c[f+0],S=c[f+1],b=c[f+2],A=c[f+3];if(d<=0){t[n+0]=m,t[n+1]=p,t[n+2]=x,t[n+3]=g;return}if(d>=1){t[n+0]=_,t[n+1]=S,t[n+2]=b,t[n+3]=A;return}if(g!==A||m!==_||p!==S||x!==b){let M=m*_+p*S+x*b+g*A;M<0&&(_=-_,S=-S,b=-b,A=-A,M=-M);let y=1-d;if(M<.9995){const z=Math.acos(M),w=Math.sin(z);y=Math.sin(y*z)/w,d=Math.sin(d*z)/w,m=m*y+_*d,p=p*y+S*d,x=x*y+b*d,g=g*y+A*d}else{m=m*y+_*d,p=p*y+S*d,x=x*y+b*d,g=g*y+A*d;const z=1/Math.sqrt(m*m+p*p+x*x+g*g);m*=z,p*=z,x*=z,g*=z}}t[n]=m,t[n+1]=p,t[n+2]=x,t[n+3]=g}static multiplyQuaternionsFlat(t,n,s,l,c,f){const d=s[l],m=s[l+1],p=s[l+2],x=s[l+3],g=c[f],_=c[f+1],S=c[f+2],b=c[f+3];return t[n]=d*b+x*g+m*S-p*_,t[n+1]=m*b+x*_+p*g-d*S,t[n+2]=p*b+x*S+d*_-m*g,t[n+3]=x*b-d*g-m*_-p*S,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,n,s,l){return this._x=t,this._y=n,this._z=s,this._w=l,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,n=!0){const s=t._x,l=t._y,c=t._z,f=t._order,d=Math.cos,m=Math.sin,p=d(s/2),x=d(l/2),g=d(c/2),_=m(s/2),S=m(l/2),b=m(c/2);switch(f){case"XYZ":this._x=_*x*g+p*S*b,this._y=p*S*g-_*x*b,this._z=p*x*b+_*S*g,this._w=p*x*g-_*S*b;break;case"YXZ":this._x=_*x*g+p*S*b,this._y=p*S*g-_*x*b,this._z=p*x*b-_*S*g,this._w=p*x*g+_*S*b;break;case"ZXY":this._x=_*x*g-p*S*b,this._y=p*S*g+_*x*b,this._z=p*x*b+_*S*g,this._w=p*x*g-_*S*b;break;case"ZYX":this._x=_*x*g-p*S*b,this._y=p*S*g+_*x*b,this._z=p*x*b-_*S*g,this._w=p*x*g+_*S*b;break;case"YZX":this._x=_*x*g+p*S*b,this._y=p*S*g+_*x*b,this._z=p*x*b-_*S*g,this._w=p*x*g-_*S*b;break;case"XZY":this._x=_*x*g-p*S*b,this._y=p*S*g-_*x*b,this._z=p*x*b+_*S*g,this._w=p*x*g+_*S*b;break;default:fe("Quaternion: .setFromEuler() encountered an unknown order: "+f)}return n===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,n){const s=n/2,l=Math.sin(s);return this._x=t.x*l,this._y=t.y*l,this._z=t.z*l,this._w=Math.cos(s),this._onChangeCallback(),this}setFromRotationMatrix(t){const n=t.elements,s=n[0],l=n[4],c=n[8],f=n[1],d=n[5],m=n[9],p=n[2],x=n[6],g=n[10],_=s+d+g;if(_>0){const S=.5/Math.sqrt(_+1);this._w=.25/S,this._x=(x-m)*S,this._y=(c-p)*S,this._z=(f-l)*S}else if(s>d&&s>g){const S=2*Math.sqrt(1+s-d-g);this._w=(x-m)/S,this._x=.25*S,this._y=(l+f)/S,this._z=(c+p)/S}else if(d>g){const S=2*Math.sqrt(1+d-s-g);this._w=(c-p)/S,this._x=(l+f)/S,this._y=.25*S,this._z=(m+x)/S}else{const S=2*Math.sqrt(1+g-s-d);this._w=(f-l)/S,this._x=(c+p)/S,this._y=(m+x)/S,this._z=.25*S}return this._onChangeCallback(),this}setFromUnitVectors(t,n){let s=t.dot(n)+1;return s<1e-8?(s=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=s):(this._x=0,this._y=-t.z,this._z=t.y,this._w=s)):(this._x=t.y*n.z-t.z*n.y,this._y=t.z*n.x-t.x*n.z,this._z=t.x*n.y-t.y*n.x,this._w=s),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(ye(this.dot(t),-1,1)))}rotateTowards(t,n){const s=this.angleTo(t);if(s===0)return this;const l=Math.min(1,n/s);return this.slerp(t,l),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,n){const s=t._x,l=t._y,c=t._z,f=t._w,d=n._x,m=n._y,p=n._z,x=n._w;return this._x=s*x+f*d+l*p-c*m,this._y=l*x+f*m+c*d-s*p,this._z=c*x+f*p+s*m-l*d,this._w=f*x-s*d-l*m-c*p,this._onChangeCallback(),this}slerp(t,n){if(n<=0)return this;if(n>=1)return this.copy(t);let s=t._x,l=t._y,c=t._z,f=t._w,d=this.dot(t);d<0&&(s=-s,l=-l,c=-c,f=-f,d=-d);let m=1-n;if(d<.9995){const p=Math.acos(d),x=Math.sin(p);m=Math.sin(m*p)/x,n=Math.sin(n*p)/x,this._x=this._x*m+s*n,this._y=this._y*m+l*n,this._z=this._z*m+c*n,this._w=this._w*m+f*n,this._onChangeCallback()}else this._x=this._x*m+s*n,this._y=this._y*m+l*n,this._z=this._z*m+c*n,this._w=this._w*m+f*n,this.normalize();return this}slerpQuaternions(t,n,s){return this.copy(t).slerp(n,s)}random(){const t=2*Math.PI*Math.random(),n=2*Math.PI*Math.random(),s=Math.random(),l=Math.sqrt(1-s),c=Math.sqrt(s);return this.set(l*Math.sin(t),l*Math.cos(t),c*Math.sin(n),c*Math.cos(n))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,n=0){return this._x=t[n],this._y=t[n+1],this._z=t[n+2],this._w=t[n+3],this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._w,t}fromBufferAttribute(t,n){return this._x=t.getX(n),this._y=t.getY(n),this._z=t.getZ(n),this._w=t.getW(n),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class Y{constructor(t=0,n=0,s=0){Y.prototype.isVector3=!0,this.x=t,this.y=n,this.z=s}set(t,n,s){return s===void 0&&(s=this.z),this.x=t,this.y=n,this.z=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,n){return this.x=t.x*n.x,this.y=t.y*n.y,this.z=t.z*n.z,this}applyEuler(t){return this.applyQuaternion(xg.setFromEuler(t))}applyAxisAngle(t,n){return this.applyQuaternion(xg.setFromAxisAngle(t,n))}applyMatrix3(t){const n=this.x,s=this.y,l=this.z,c=t.elements;return this.x=c[0]*n+c[3]*s+c[6]*l,this.y=c[1]*n+c[4]*s+c[7]*l,this.z=c[2]*n+c[5]*s+c[8]*l,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const n=this.x,s=this.y,l=this.z,c=t.elements,f=1/(c[3]*n+c[7]*s+c[11]*l+c[15]);return this.x=(c[0]*n+c[4]*s+c[8]*l+c[12])*f,this.y=(c[1]*n+c[5]*s+c[9]*l+c[13])*f,this.z=(c[2]*n+c[6]*s+c[10]*l+c[14])*f,this}applyQuaternion(t){const n=this.x,s=this.y,l=this.z,c=t.x,f=t.y,d=t.z,m=t.w,p=2*(f*l-d*s),x=2*(d*n-c*l),g=2*(c*s-f*n);return this.x=n+m*p+f*g-d*x,this.y=s+m*x+d*p-c*g,this.z=l+m*g+c*x-f*p,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const n=this.x,s=this.y,l=this.z,c=t.elements;return this.x=c[0]*n+c[4]*s+c[8]*l,this.y=c[1]*n+c[5]*s+c[9]*l,this.z=c[2]*n+c[6]*s+c[10]*l,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,n){return this.x=ye(this.x,t.x,n.x),this.y=ye(this.y,t.y,n.y),this.z=ye(this.z,t.z,n.z),this}clampScalar(t,n){return this.x=ye(this.x,t,n),this.y=ye(this.y,t,n),this.z=ye(this.z,t,n),this}clampLength(t,n){const s=this.length();return this.divideScalar(s||1).multiplyScalar(ye(s,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this}lerpVectors(t,n,s){return this.x=t.x+(n.x-t.x)*s,this.y=t.y+(n.y-t.y)*s,this.z=t.z+(n.z-t.z)*s,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,n){const s=t.x,l=t.y,c=t.z,f=n.x,d=n.y,m=n.z;return this.x=l*m-c*d,this.y=c*f-s*m,this.z=s*d-l*f,this}projectOnVector(t){const n=t.lengthSq();if(n===0)return this.set(0,0,0);const s=t.dot(this)/n;return this.copy(t).multiplyScalar(s)}projectOnPlane(t){return Ch.copy(this).projectOnVector(t),this.sub(Ch)}reflect(t){return this.sub(Ch.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;const s=this.dot(t)/n;return Math.acos(ye(s,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const n=this.x-t.x,s=this.y-t.y,l=this.z-t.z;return n*n+s*s+l*l}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,n,s){const l=Math.sin(n)*t;return this.x=l*Math.sin(s),this.y=Math.cos(n)*t,this.z=l*Math.cos(s),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,n,s){return this.x=t*Math.sin(n),this.y=s,this.z=t*Math.cos(n),this}setFromMatrixPosition(t){const n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}setFromMatrixScale(t){const n=this.setFromMatrixColumn(t,0).length(),s=this.setFromMatrixColumn(t,1).length(),l=this.setFromMatrixColumn(t,2).length();return this.x=n,this.y=s,this.z=l,this}setFromMatrixColumn(t,n){return this.fromArray(t.elements,n*4)}setFromMatrix3Column(t,n){return this.fromArray(t.elements,n*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,n=Math.random()*2-1,s=Math.sqrt(1-n*n);return this.x=s*Math.cos(t),this.y=n,this.z=s*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Ch=new Y,xg=new is;class _e{constructor(t,n,s,l,c,f,d,m,p){_e.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,n,s,l,c,f,d,m,p)}set(t,n,s,l,c,f,d,m,p){const x=this.elements;return x[0]=t,x[1]=l,x[2]=d,x[3]=n,x[4]=c,x[5]=m,x[6]=s,x[7]=f,x[8]=p,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const n=this.elements,s=t.elements;return n[0]=s[0],n[1]=s[1],n[2]=s[2],n[3]=s[3],n[4]=s[4],n[5]=s[5],n[6]=s[6],n[7]=s[7],n[8]=s[8],this}extractBasis(t,n,s){return t.setFromMatrix3Column(this,0),n.setFromMatrix3Column(this,1),s.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const n=t.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){const s=t.elements,l=n.elements,c=this.elements,f=s[0],d=s[3],m=s[6],p=s[1],x=s[4],g=s[7],_=s[2],S=s[5],b=s[8],A=l[0],M=l[3],y=l[6],z=l[1],w=l[4],O=l[7],k=l[2],P=l[5],F=l[8];return c[0]=f*A+d*z+m*k,c[3]=f*M+d*w+m*P,c[6]=f*y+d*O+m*F,c[1]=p*A+x*z+g*k,c[4]=p*M+x*w+g*P,c[7]=p*y+x*O+g*F,c[2]=_*A+S*z+b*k,c[5]=_*M+S*w+b*P,c[8]=_*y+S*O+b*F,this}multiplyScalar(t){const n=this.elements;return n[0]*=t,n[3]*=t,n[6]*=t,n[1]*=t,n[4]*=t,n[7]*=t,n[2]*=t,n[5]*=t,n[8]*=t,this}determinant(){const t=this.elements,n=t[0],s=t[1],l=t[2],c=t[3],f=t[4],d=t[5],m=t[6],p=t[7],x=t[8];return n*f*x-n*d*p-s*c*x+s*d*m+l*c*p-l*f*m}invert(){const t=this.elements,n=t[0],s=t[1],l=t[2],c=t[3],f=t[4],d=t[5],m=t[6],p=t[7],x=t[8],g=x*f-d*p,_=d*m-x*c,S=p*c-f*m,b=n*g+s*_+l*S;if(b===0)return this.set(0,0,0,0,0,0,0,0,0);const A=1/b;return t[0]=g*A,t[1]=(l*p-x*s)*A,t[2]=(d*s-l*f)*A,t[3]=_*A,t[4]=(x*n-l*m)*A,t[5]=(l*c-d*n)*A,t[6]=S*A,t[7]=(s*m-p*n)*A,t[8]=(f*n-s*c)*A,this}transpose(){let t;const n=this.elements;return t=n[1],n[1]=n[3],n[3]=t,t=n[2],n[2]=n[6],n[6]=t,t=n[5],n[5]=n[7],n[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const n=this.elements;return t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8],this}setUvTransform(t,n,s,l,c,f,d){const m=Math.cos(c),p=Math.sin(c);return this.set(s*m,s*p,-s*(m*f+p*d)+f+t,-l*p,l*m,-l*(-p*f+m*d)+d+n,0,0,1),this}scale(t,n){return this.premultiply(wh.makeScale(t,n)),this}rotate(t){return this.premultiply(wh.makeRotation(-t)),this}translate(t,n){return this.premultiply(wh.makeTranslation(t,n)),this}makeTranslation(t,n){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,n,0,0,1),this}makeRotation(t){const n=Math.cos(t),s=Math.sin(t);return this.set(n,-s,0,s,n,0,0,0,1),this}makeScale(t,n){return this.set(t,0,0,0,n,0,0,0,1),this}equals(t){const n=this.elements,s=t.elements;for(let l=0;l<9;l++)if(n[l]!==s[l])return!1;return!0}fromArray(t,n=0){for(let s=0;s<9;s++)this.elements[s]=t[s+n];return this}toArray(t=[],n=0){const s=this.elements;return t[n]=s[0],t[n+1]=s[1],t[n+2]=s[2],t[n+3]=s[3],t[n+4]=s[4],t[n+5]=s[5],t[n+6]=s[6],t[n+7]=s[7],t[n+8]=s[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const wh=new _e,gg=new _e().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),_g=new _e().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function fM(){const r={enabled:!0,workingColorSpace:zr,spaces:{},convert:function(l,c,f){return this.enabled===!1||c===f||!c||!f||(this.spaces[c].transfer===Xe&&(l.r=va(l.r),l.g=va(l.g),l.b=va(l.b)),this.spaces[c].primaries!==this.spaces[f].primaries&&(l.applyMatrix3(this.spaces[c].toXYZ),l.applyMatrix3(this.spaces[f].fromXYZ)),this.spaces[f].transfer===Xe&&(l.r=Lr(l.r),l.g=Lr(l.g),l.b=Lr(l.b))),l},workingToColorSpace:function(l,c){return this.convert(l,this.workingColorSpace,c)},colorSpaceToWorking:function(l,c){return this.convert(l,c,this.workingColorSpace)},getPrimaries:function(l){return this.spaces[l].primaries},getTransfer:function(l){return l===$a?tu:this.spaces[l].transfer},getToneMappingMode:function(l){return this.spaces[l].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(l,c=this.workingColorSpace){return l.fromArray(this.spaces[c].luminanceCoefficients)},define:function(l){Object.assign(this.spaces,l)},_getMatrix:function(l,c,f){return l.copy(this.spaces[c].toXYZ).multiply(this.spaces[f].fromXYZ)},_getDrawingBufferColorSpace:function(l){return this.spaces[l].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(l=this.workingColorSpace){return this.spaces[l].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(l,c){return nl("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),r.workingToColorSpace(l,c)},toWorkingColorSpace:function(l,c){return nl("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),r.colorSpaceToWorking(l,c)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],s=[.3127,.329];return r.define({[zr]:{primaries:t,whitePoint:s,transfer:tu,toXYZ:gg,fromXYZ:_g,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:gi},outputColorSpaceConfig:{drawingBufferColorSpace:gi}},[gi]:{primaries:t,whitePoint:s,transfer:Xe,toXYZ:gg,fromXYZ:_g,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:gi}}}),r}const Oe=fM();function va(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function Lr(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}let mr;class hM{static getDataURL(t,n="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let s;if(t instanceof HTMLCanvasElement)s=t;else{mr===void 0&&(mr=nu("canvas")),mr.width=t.width,mr.height=t.height;const l=mr.getContext("2d");t instanceof ImageData?l.putImageData(t,0,0):l.drawImage(t,0,0,t.width,t.height),s=mr}return s.toDataURL(n)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const n=nu("canvas");n.width=t.width,n.height=t.height;const s=n.getContext("2d");s.drawImage(t,0,0,t.width,t.height);const l=s.getImageData(0,0,t.width,t.height),c=l.data;for(let f=0;f<c.length;f++)c[f]=va(c[f]/255)*255;return s.putImageData(l,0,0),n}else if(t.data){const n=t.data.slice(0);for(let s=0;s<n.length;s++)n instanceof Uint8Array||n instanceof Uint8ClampedArray?n[s]=Math.floor(va(n[s]/255)*255):n[s]=va(n[s]);return{data:n,width:t.width,height:t.height}}else return fe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let dM=0;class up{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:dM++}),this.uuid=Hr(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const n=this.data;return typeof HTMLVideoElement<"u"&&n instanceof HTMLVideoElement?t.set(n.videoWidth,n.videoHeight,0):n instanceof VideoFrame?t.set(n.displayHeight,n.displayWidth,0):n!==null?t.set(n.width,n.height,n.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const n=t===void 0||typeof t=="string";if(!n&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const s={uuid:this.uuid,url:""},l=this.data;if(l!==null){let c;if(Array.isArray(l)){c=[];for(let f=0,d=l.length;f<d;f++)l[f].isDataTexture?c.push(Dh(l[f].image)):c.push(Dh(l[f]))}else c=Dh(l);s.url=c}return n||(t.images[this.uuid]=s),s}}function Dh(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?hM.getDataURL(r):r.data?{data:Array.from(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(fe("Texture: Unable to serialize Texture."),{})}let pM=0;const Uh=new Y;class In extends Ps{constructor(t=In.DEFAULT_IMAGE,n=In.DEFAULT_MAPPING,s=xa,l=xa,c=yi,f=Us,d=Ci,m=Fi,p=In.DEFAULT_ANISOTROPY,x=$a){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:pM++}),this.uuid=Hr(),this.name="",this.source=new up(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=s,this.wrapT=l,this.magFilter=c,this.minFilter=f,this.anisotropy=p,this.format=d,this.internalFormat=null,this.type=m,this.offset=new Nt(0,0),this.repeat=new Nt(1,1),this.center=new Nt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new _e,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=x,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Uh).x}get height(){return this.source.getSize(Uh).y}get depth(){return this.source.getSize(Uh).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const n in t){const s=t[n];if(s===void 0){fe(`Texture.setValues(): parameter '${n}' has value of undefined.`);continue}const l=this[n];if(l===void 0){fe(`Texture.setValues(): property '${n}' does not exist.`);continue}l&&s&&l.isVector2&&s.isVector2||l&&s&&l.isVector3&&s.isVector3||l&&s&&l.isMatrix3&&s.isMatrix3?l.copy(s):this[n]=s}}toJSON(t){const n=t===void 0||typeof t=="string";if(!n&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const s={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(s.userData=this.userData),n||(t.textures[this.uuid]=s),s}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==y_)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case vd:t.x=t.x-Math.floor(t.x);break;case xa:t.x=t.x<0?0:1;break;case yd:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case vd:t.y=t.y-Math.floor(t.y);break;case xa:t.y=t.y<0?0:1;break;case yd:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}In.DEFAULT_IMAGE=null;In.DEFAULT_MAPPING=y_;In.DEFAULT_ANISOTROPY=1;class sn{constructor(t=0,n=0,s=0,l=1){sn.prototype.isVector4=!0,this.x=t,this.y=n,this.z=s,this.w=l}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,n,s,l){return this.x=t,this.y=n,this.z=s,this.w=l,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;case 3:this.w=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this.w=t.w+n.w,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this.w+=t.w*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this.w=t.w-n.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const n=this.x,s=this.y,l=this.z,c=this.w,f=t.elements;return this.x=f[0]*n+f[4]*s+f[8]*l+f[12]*c,this.y=f[1]*n+f[5]*s+f[9]*l+f[13]*c,this.z=f[2]*n+f[6]*s+f[10]*l+f[14]*c,this.w=f[3]*n+f[7]*s+f[11]*l+f[15]*c,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const n=Math.sqrt(1-t.w*t.w);return n<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/n,this.y=t.y/n,this.z=t.z/n),this}setAxisAngleFromRotationMatrix(t){let n,s,l,c;const m=t.elements,p=m[0],x=m[4],g=m[8],_=m[1],S=m[5],b=m[9],A=m[2],M=m[6],y=m[10];if(Math.abs(x-_)<.01&&Math.abs(g-A)<.01&&Math.abs(b-M)<.01){if(Math.abs(x+_)<.1&&Math.abs(g+A)<.1&&Math.abs(b+M)<.1&&Math.abs(p+S+y-3)<.1)return this.set(1,0,0,0),this;n=Math.PI;const w=(p+1)/2,O=(S+1)/2,k=(y+1)/2,P=(x+_)/4,F=(g+A)/4,Q=(b+M)/4;return w>O&&w>k?w<.01?(s=0,l=.707106781,c=.707106781):(s=Math.sqrt(w),l=P/s,c=F/s):O>k?O<.01?(s=.707106781,l=0,c=.707106781):(l=Math.sqrt(O),s=P/l,c=Q/l):k<.01?(s=.707106781,l=.707106781,c=0):(c=Math.sqrt(k),s=F/c,l=Q/c),this.set(s,l,c,n),this}let z=Math.sqrt((M-b)*(M-b)+(g-A)*(g-A)+(_-x)*(_-x));return Math.abs(z)<.001&&(z=1),this.x=(M-b)/z,this.y=(g-A)/z,this.z=(_-x)/z,this.w=Math.acos((p+S+y-1)/2),this}setFromMatrixPosition(t){const n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this.w=n[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,n){return this.x=ye(this.x,t.x,n.x),this.y=ye(this.y,t.y,n.y),this.z=ye(this.z,t.z,n.z),this.w=ye(this.w,t.w,n.w),this}clampScalar(t,n){return this.x=ye(this.x,t,n),this.y=ye(this.y,t,n),this.z=ye(this.z,t,n),this.w=ye(this.w,t,n),this}clampLength(t,n){const s=this.length();return this.divideScalar(s||1).multiplyScalar(ye(s,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this.w+=(t.w-this.w)*n,this}lerpVectors(t,n,s){return this.x=t.x+(n.x-t.x)*s,this.y=t.y+(n.y-t.y)*s,this.z=t.z+(n.z-t.z)*s,this.w=t.w+(n.w-t.w)*s,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this.w=t[n+3],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t[n+3]=this.w,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this.w=t.getW(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class mM extends Ps{constructor(t=1,n=1,s={}){super(),s=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:yi,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},s),this.isRenderTarget=!0,this.width=t,this.height=n,this.depth=s.depth,this.scissor=new sn(0,0,t,n),this.scissorTest=!1,this.viewport=new sn(0,0,t,n);const l={width:t,height:n,depth:s.depth},c=new In(l);this.textures=[];const f=s.count;for(let d=0;d<f;d++)this.textures[d]=c.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(s),this.depthBuffer=s.depthBuffer,this.stencilBuffer=s.stencilBuffer,this.resolveDepthBuffer=s.resolveDepthBuffer,this.resolveStencilBuffer=s.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=s.depthTexture,this.samples=s.samples,this.multiview=s.multiview}_setTextureOptions(t={}){const n={minFilter:yi,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(n.mapping=t.mapping),t.wrapS!==void 0&&(n.wrapS=t.wrapS),t.wrapT!==void 0&&(n.wrapT=t.wrapT),t.wrapR!==void 0&&(n.wrapR=t.wrapR),t.magFilter!==void 0&&(n.magFilter=t.magFilter),t.minFilter!==void 0&&(n.minFilter=t.minFilter),t.format!==void 0&&(n.format=t.format),t.type!==void 0&&(n.type=t.type),t.anisotropy!==void 0&&(n.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(n.colorSpace=t.colorSpace),t.flipY!==void 0&&(n.flipY=t.flipY),t.generateMipmaps!==void 0&&(n.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(n.internalFormat=t.internalFormat);for(let s=0;s<this.textures.length;s++)this.textures[s].setValues(n)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,n,s=1){if(this.width!==t||this.height!==n||this.depth!==s){this.width=t,this.height=n,this.depth=s;for(let l=0,c=this.textures.length;l<c;l++)this.textures[l].image.width=t,this.textures[l].image.height=n,this.textures[l].image.depth=s,this.textures[l].isData3DTexture!==!0&&(this.textures[l].isArrayTexture=this.textures[l].image.depth>1);this.dispose()}this.viewport.set(0,0,t,n),this.scissor.set(0,0,t,n)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,s=t.textures.length;n<s;n++){this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0,this.textures[n].renderTarget=this;const l=Object.assign({},t.textures[n].image);this.textures[n].source=new up(l)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ns extends mM{constructor(t=1,n=1,s={}){super(t,n,s),this.isWebGLRenderTarget=!0}}class U_ extends In{constructor(t=null,n=1,s=1,l=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:n,height:s,depth:l},this.magFilter=oi,this.minFilter=oi,this.wrapR=xa,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class xM extends In{constructor(t=null,n=1,s=1,l=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:n,height:s,depth:l},this.magFilter=oi,this.minFilter=oi,this.wrapR=xa,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class rl{constructor(t=new Y(1/0,1/0,1/0),n=new Y(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=n}set(t,n){return this.min.copy(t),this.max.copy(n),this}setFromArray(t){this.makeEmpty();for(let n=0,s=t.length;n<s;n+=3)this.expandByPoint(Ti.fromArray(t,n));return this}setFromBufferAttribute(t){this.makeEmpty();for(let n=0,s=t.count;n<s;n++)this.expandByPoint(Ti.fromBufferAttribute(t,n));return this}setFromPoints(t){this.makeEmpty();for(let n=0,s=t.length;n<s;n++)this.expandByPoint(t[n]);return this}setFromCenterAndSize(t,n){const s=Ti.copy(n).multiplyScalar(.5);return this.min.copy(t).sub(s),this.max.copy(t).add(s),this}setFromObject(t,n=!1){return this.makeEmpty(),this.expandByObject(t,n)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,n=!1){t.updateWorldMatrix(!1,!1);const s=t.geometry;if(s!==void 0){const c=s.getAttribute("position");if(n===!0&&c!==void 0&&t.isInstancedMesh!==!0)for(let f=0,d=c.count;f<d;f++)t.isMesh===!0?t.getVertexPosition(f,Ti):Ti.fromBufferAttribute(c,f),Ti.applyMatrix4(t.matrixWorld),this.expandByPoint(Ti);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),vc.copy(t.boundingBox)):(s.boundingBox===null&&s.computeBoundingBox(),vc.copy(s.boundingBox)),vc.applyMatrix4(t.matrixWorld),this.union(vc)}const l=t.children;for(let c=0,f=l.length;c<f;c++)this.expandByObject(l[c],n);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,n){return n.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Ti),Ti.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let n,s;return t.normal.x>0?(n=t.normal.x*this.min.x,s=t.normal.x*this.max.x):(n=t.normal.x*this.max.x,s=t.normal.x*this.min.x),t.normal.y>0?(n+=t.normal.y*this.min.y,s+=t.normal.y*this.max.y):(n+=t.normal.y*this.max.y,s+=t.normal.y*this.min.y),t.normal.z>0?(n+=t.normal.z*this.min.z,s+=t.normal.z*this.max.z):(n+=t.normal.z*this.max.z,s+=t.normal.z*this.min.z),n<=-t.constant&&s>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Ho),yc.subVectors(this.max,Ho),xr.subVectors(t.a,Ho),gr.subVectors(t.b,Ho),_r.subVectors(t.c,Ho),qa.subVectors(gr,xr),Ya.subVectors(_r,gr),Ms.subVectors(xr,_r);let n=[0,-qa.z,qa.y,0,-Ya.z,Ya.y,0,-Ms.z,Ms.y,qa.z,0,-qa.x,Ya.z,0,-Ya.x,Ms.z,0,-Ms.x,-qa.y,qa.x,0,-Ya.y,Ya.x,0,-Ms.y,Ms.x,0];return!Lh(n,xr,gr,_r,yc)||(n=[1,0,0,0,1,0,0,0,1],!Lh(n,xr,gr,_r,yc))?!1:(Sc.crossVectors(qa,Ya),n=[Sc.x,Sc.y,Sc.z],Lh(n,xr,gr,_r,yc))}clampPoint(t,n){return n.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Ti).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Ti).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(la[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),la[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),la[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),la[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),la[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),la[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),la[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),la[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(la),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const la=[new Y,new Y,new Y,new Y,new Y,new Y,new Y,new Y],Ti=new Y,vc=new rl,xr=new Y,gr=new Y,_r=new Y,qa=new Y,Ya=new Y,Ms=new Y,Ho=new Y,yc=new Y,Sc=new Y,bs=new Y;function Lh(r,t,n,s,l){for(let c=0,f=r.length-3;c<=f;c+=3){bs.fromArray(r,c);const d=l.x*Math.abs(bs.x)+l.y*Math.abs(bs.y)+l.z*Math.abs(bs.z),m=t.dot(bs),p=n.dot(bs),x=s.dot(bs);if(Math.max(-Math.max(m,p,x),Math.min(m,p,x))>d)return!1}return!0}const gM=new rl,Go=new Y,Nh=new Y;class ou{constructor(t=new Y,n=-1){this.isSphere=!0,this.center=t,this.radius=n}set(t,n){return this.center.copy(t),this.radius=n,this}setFromPoints(t,n){const s=this.center;n!==void 0?s.copy(n):gM.setFromPoints(t).getCenter(s);let l=0;for(let c=0,f=t.length;c<f;c++)l=Math.max(l,s.distanceToSquared(t[c]));return this.radius=Math.sqrt(l),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const n=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=n*n}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,n){const s=this.center.distanceToSquared(t);return n.copy(t),s>this.radius*this.radius&&(n.sub(this.center).normalize(),n.multiplyScalar(this.radius).add(this.center)),n}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Go.subVectors(t,this.center);const n=Go.lengthSq();if(n>this.radius*this.radius){const s=Math.sqrt(n),l=(s-this.radius)*.5;this.center.addScaledVector(Go,l/s),this.radius+=l}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Nh.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Go.copy(t.center).add(Nh)),this.expandByPoint(Go.copy(t.center).sub(Nh))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}const ca=new Y,Oh=new Y,Mc=new Y,ja=new Y,Ph=new Y,bc=new Y,zh=new Y;class fp{constructor(t=new Y,n=new Y(0,0,-1)){this.origin=t,this.direction=n}set(t,n){return this.origin.copy(t),this.direction.copy(n),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,n){return n.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,ca)),this}closestPointToPoint(t,n){n.subVectors(t,this.origin);const s=n.dot(this.direction);return s<0?n.copy(this.origin):n.copy(this.origin).addScaledVector(this.direction,s)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const n=ca.subVectors(t,this.origin).dot(this.direction);return n<0?this.origin.distanceToSquared(t):(ca.copy(this.origin).addScaledVector(this.direction,n),ca.distanceToSquared(t))}distanceSqToSegment(t,n,s,l){Oh.copy(t).add(n).multiplyScalar(.5),Mc.copy(n).sub(t).normalize(),ja.copy(this.origin).sub(Oh);const c=t.distanceTo(n)*.5,f=-this.direction.dot(Mc),d=ja.dot(this.direction),m=-ja.dot(Mc),p=ja.lengthSq(),x=Math.abs(1-f*f);let g,_,S,b;if(x>0)if(g=f*m-d,_=f*d-m,b=c*x,g>=0)if(_>=-b)if(_<=b){const A=1/x;g*=A,_*=A,S=g*(g+f*_+2*d)+_*(f*g+_+2*m)+p}else _=c,g=Math.max(0,-(f*_+d)),S=-g*g+_*(_+2*m)+p;else _=-c,g=Math.max(0,-(f*_+d)),S=-g*g+_*(_+2*m)+p;else _<=-b?(g=Math.max(0,-(-f*c+d)),_=g>0?-c:Math.min(Math.max(-c,-m),c),S=-g*g+_*(_+2*m)+p):_<=b?(g=0,_=Math.min(Math.max(-c,-m),c),S=_*(_+2*m)+p):(g=Math.max(0,-(f*c+d)),_=g>0?c:Math.min(Math.max(-c,-m),c),S=-g*g+_*(_+2*m)+p);else _=f>0?-c:c,g=Math.max(0,-(f*_+d)),S=-g*g+_*(_+2*m)+p;return s&&s.copy(this.origin).addScaledVector(this.direction,g),l&&l.copy(Oh).addScaledVector(Mc,_),S}intersectSphere(t,n){ca.subVectors(t.center,this.origin);const s=ca.dot(this.direction),l=ca.dot(ca)-s*s,c=t.radius*t.radius;if(l>c)return null;const f=Math.sqrt(c-l),d=s-f,m=s+f;return m<0?null:d<0?this.at(m,n):this.at(d,n)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const n=t.normal.dot(this.direction);if(n===0)return t.distanceToPoint(this.origin)===0?0:null;const s=-(this.origin.dot(t.normal)+t.constant)/n;return s>=0?s:null}intersectPlane(t,n){const s=this.distanceToPlane(t);return s===null?null:this.at(s,n)}intersectsPlane(t){const n=t.distanceToPoint(this.origin);return n===0||t.normal.dot(this.direction)*n<0}intersectBox(t,n){let s,l,c,f,d,m;const p=1/this.direction.x,x=1/this.direction.y,g=1/this.direction.z,_=this.origin;return p>=0?(s=(t.min.x-_.x)*p,l=(t.max.x-_.x)*p):(s=(t.max.x-_.x)*p,l=(t.min.x-_.x)*p),x>=0?(c=(t.min.y-_.y)*x,f=(t.max.y-_.y)*x):(c=(t.max.y-_.y)*x,f=(t.min.y-_.y)*x),s>f||c>l||((c>s||isNaN(s))&&(s=c),(f<l||isNaN(l))&&(l=f),g>=0?(d=(t.min.z-_.z)*g,m=(t.max.z-_.z)*g):(d=(t.max.z-_.z)*g,m=(t.min.z-_.z)*g),s>m||d>l)||((d>s||s!==s)&&(s=d),(m<l||l!==l)&&(l=m),l<0)?null:this.at(s>=0?s:l,n)}intersectsBox(t){return this.intersectBox(t,ca)!==null}intersectTriangle(t,n,s,l,c){Ph.subVectors(n,t),bc.subVectors(s,t),zh.crossVectors(Ph,bc);let f=this.direction.dot(zh),d;if(f>0){if(l)return null;d=1}else if(f<0)d=-1,f=-f;else return null;ja.subVectors(this.origin,t);const m=d*this.direction.dot(bc.crossVectors(ja,bc));if(m<0)return null;const p=d*this.direction.dot(Ph.cross(ja));if(p<0||m+p>f)return null;const x=-d*ja.dot(zh);return x<0?null:this.at(x/f,c)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class tn{constructor(t,n,s,l,c,f,d,m,p,x,g,_,S,b,A,M){tn.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,n,s,l,c,f,d,m,p,x,g,_,S,b,A,M)}set(t,n,s,l,c,f,d,m,p,x,g,_,S,b,A,M){const y=this.elements;return y[0]=t,y[4]=n,y[8]=s,y[12]=l,y[1]=c,y[5]=f,y[9]=d,y[13]=m,y[2]=p,y[6]=x,y[10]=g,y[14]=_,y[3]=S,y[7]=b,y[11]=A,y[15]=M,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new tn().fromArray(this.elements)}copy(t){const n=this.elements,s=t.elements;return n[0]=s[0],n[1]=s[1],n[2]=s[2],n[3]=s[3],n[4]=s[4],n[5]=s[5],n[6]=s[6],n[7]=s[7],n[8]=s[8],n[9]=s[9],n[10]=s[10],n[11]=s[11],n[12]=s[12],n[13]=s[13],n[14]=s[14],n[15]=s[15],this}copyPosition(t){const n=this.elements,s=t.elements;return n[12]=s[12],n[13]=s[13],n[14]=s[14],this}setFromMatrix3(t){const n=t.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(t,n,s){return t.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),s.setFromMatrixColumn(this,2),this}makeBasis(t,n,s){return this.set(t.x,n.x,s.x,0,t.y,n.y,s.y,0,t.z,n.z,s.z,0,0,0,0,1),this}extractRotation(t){const n=this.elements,s=t.elements,l=1/vr.setFromMatrixColumn(t,0).length(),c=1/vr.setFromMatrixColumn(t,1).length(),f=1/vr.setFromMatrixColumn(t,2).length();return n[0]=s[0]*l,n[1]=s[1]*l,n[2]=s[2]*l,n[3]=0,n[4]=s[4]*c,n[5]=s[5]*c,n[6]=s[6]*c,n[7]=0,n[8]=s[8]*f,n[9]=s[9]*f,n[10]=s[10]*f,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(t){const n=this.elements,s=t.x,l=t.y,c=t.z,f=Math.cos(s),d=Math.sin(s),m=Math.cos(l),p=Math.sin(l),x=Math.cos(c),g=Math.sin(c);if(t.order==="XYZ"){const _=f*x,S=f*g,b=d*x,A=d*g;n[0]=m*x,n[4]=-m*g,n[8]=p,n[1]=S+b*p,n[5]=_-A*p,n[9]=-d*m,n[2]=A-_*p,n[6]=b+S*p,n[10]=f*m}else if(t.order==="YXZ"){const _=m*x,S=m*g,b=p*x,A=p*g;n[0]=_+A*d,n[4]=b*d-S,n[8]=f*p,n[1]=f*g,n[5]=f*x,n[9]=-d,n[2]=S*d-b,n[6]=A+_*d,n[10]=f*m}else if(t.order==="ZXY"){const _=m*x,S=m*g,b=p*x,A=p*g;n[0]=_-A*d,n[4]=-f*g,n[8]=b+S*d,n[1]=S+b*d,n[5]=f*x,n[9]=A-_*d,n[2]=-f*p,n[6]=d,n[10]=f*m}else if(t.order==="ZYX"){const _=f*x,S=f*g,b=d*x,A=d*g;n[0]=m*x,n[4]=b*p-S,n[8]=_*p+A,n[1]=m*g,n[5]=A*p+_,n[9]=S*p-b,n[2]=-p,n[6]=d*m,n[10]=f*m}else if(t.order==="YZX"){const _=f*m,S=f*p,b=d*m,A=d*p;n[0]=m*x,n[4]=A-_*g,n[8]=b*g+S,n[1]=g,n[5]=f*x,n[9]=-d*x,n[2]=-p*x,n[6]=S*g+b,n[10]=_-A*g}else if(t.order==="XZY"){const _=f*m,S=f*p,b=d*m,A=d*p;n[0]=m*x,n[4]=-g,n[8]=p*x,n[1]=_*g+A,n[5]=f*x,n[9]=S*g-b,n[2]=b*g-S,n[6]=d*x,n[10]=A*g+_}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(t){return this.compose(_M,t,vM)}lookAt(t,n,s){const l=this.elements;return si.subVectors(t,n),si.lengthSq()===0&&(si.z=1),si.normalize(),Za.crossVectors(s,si),Za.lengthSq()===0&&(Math.abs(s.z)===1?si.x+=1e-4:si.z+=1e-4,si.normalize(),Za.crossVectors(s,si)),Za.normalize(),Ec.crossVectors(si,Za),l[0]=Za.x,l[4]=Ec.x,l[8]=si.x,l[1]=Za.y,l[5]=Ec.y,l[9]=si.y,l[2]=Za.z,l[6]=Ec.z,l[10]=si.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){const s=t.elements,l=n.elements,c=this.elements,f=s[0],d=s[4],m=s[8],p=s[12],x=s[1],g=s[5],_=s[9],S=s[13],b=s[2],A=s[6],M=s[10],y=s[14],z=s[3],w=s[7],O=s[11],k=s[15],P=l[0],F=l[4],Q=l[8],D=l[12],C=l[1],H=l[5],nt=l[9],ct=l[13],pt=l[2],lt=l[6],B=l[10],q=l[14],j=l[3],xt=l[7],vt=l[11],N=l[15];return c[0]=f*P+d*C+m*pt+p*j,c[4]=f*F+d*H+m*lt+p*xt,c[8]=f*Q+d*nt+m*B+p*vt,c[12]=f*D+d*ct+m*q+p*N,c[1]=x*P+g*C+_*pt+S*j,c[5]=x*F+g*H+_*lt+S*xt,c[9]=x*Q+g*nt+_*B+S*vt,c[13]=x*D+g*ct+_*q+S*N,c[2]=b*P+A*C+M*pt+y*j,c[6]=b*F+A*H+M*lt+y*xt,c[10]=b*Q+A*nt+M*B+y*vt,c[14]=b*D+A*ct+M*q+y*N,c[3]=z*P+w*C+O*pt+k*j,c[7]=z*F+w*H+O*lt+k*xt,c[11]=z*Q+w*nt+O*B+k*vt,c[15]=z*D+w*ct+O*q+k*N,this}multiplyScalar(t){const n=this.elements;return n[0]*=t,n[4]*=t,n[8]*=t,n[12]*=t,n[1]*=t,n[5]*=t,n[9]*=t,n[13]*=t,n[2]*=t,n[6]*=t,n[10]*=t,n[14]*=t,n[3]*=t,n[7]*=t,n[11]*=t,n[15]*=t,this}determinant(){const t=this.elements,n=t[0],s=t[4],l=t[8],c=t[12],f=t[1],d=t[5],m=t[9],p=t[13],x=t[2],g=t[6],_=t[10],S=t[14],b=t[3],A=t[7],M=t[11],y=t[15];return b*(+c*m*g-l*p*g-c*d*_+s*p*_+l*d*S-s*m*S)+A*(+n*m*S-n*p*_+c*f*_-l*f*S+l*p*x-c*m*x)+M*(+n*p*g-n*d*S-c*f*g+s*f*S+c*d*x-s*p*x)+y*(-l*d*x-n*m*g+n*d*_+l*f*g-s*f*_+s*m*x)}transpose(){const t=this.elements;let n;return n=t[1],t[1]=t[4],t[4]=n,n=t[2],t[2]=t[8],t[8]=n,n=t[6],t[6]=t[9],t[9]=n,n=t[3],t[3]=t[12],t[12]=n,n=t[7],t[7]=t[13],t[13]=n,n=t[11],t[11]=t[14],t[14]=n,this}setPosition(t,n,s){const l=this.elements;return t.isVector3?(l[12]=t.x,l[13]=t.y,l[14]=t.z):(l[12]=t,l[13]=n,l[14]=s),this}invert(){const t=this.elements,n=t[0],s=t[1],l=t[2],c=t[3],f=t[4],d=t[5],m=t[6],p=t[7],x=t[8],g=t[9],_=t[10],S=t[11],b=t[12],A=t[13],M=t[14],y=t[15],z=g*M*p-A*_*p+A*m*S-d*M*S-g*m*y+d*_*y,w=b*_*p-x*M*p-b*m*S+f*M*S+x*m*y-f*_*y,O=x*A*p-b*g*p+b*d*S-f*A*S-x*d*y+f*g*y,k=b*g*m-x*A*m-b*d*_+f*A*_+x*d*M-f*g*M,P=n*z+s*w+l*O+c*k;if(P===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const F=1/P;return t[0]=z*F,t[1]=(A*_*c-g*M*c-A*l*S+s*M*S+g*l*y-s*_*y)*F,t[2]=(d*M*c-A*m*c+A*l*p-s*M*p-d*l*y+s*m*y)*F,t[3]=(g*m*c-d*_*c-g*l*p+s*_*p+d*l*S-s*m*S)*F,t[4]=w*F,t[5]=(x*M*c-b*_*c+b*l*S-n*M*S-x*l*y+n*_*y)*F,t[6]=(b*m*c-f*M*c-b*l*p+n*M*p+f*l*y-n*m*y)*F,t[7]=(f*_*c-x*m*c+x*l*p-n*_*p-f*l*S+n*m*S)*F,t[8]=O*F,t[9]=(b*g*c-x*A*c-b*s*S+n*A*S+x*s*y-n*g*y)*F,t[10]=(f*A*c-b*d*c+b*s*p-n*A*p-f*s*y+n*d*y)*F,t[11]=(x*d*c-f*g*c-x*s*p+n*g*p+f*s*S-n*d*S)*F,t[12]=k*F,t[13]=(x*A*l-b*g*l+b*s*_-n*A*_-x*s*M+n*g*M)*F,t[14]=(b*d*l-f*A*l-b*s*m+n*A*m+f*s*M-n*d*M)*F,t[15]=(f*g*l-x*d*l+x*s*m-n*g*m-f*s*_+n*d*_)*F,this}scale(t){const n=this.elements,s=t.x,l=t.y,c=t.z;return n[0]*=s,n[4]*=l,n[8]*=c,n[1]*=s,n[5]*=l,n[9]*=c,n[2]*=s,n[6]*=l,n[10]*=c,n[3]*=s,n[7]*=l,n[11]*=c,this}getMaxScaleOnAxis(){const t=this.elements,n=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],s=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],l=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(n,s,l))}makeTranslation(t,n,s){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,n,0,0,1,s,0,0,0,1),this}makeRotationX(t){const n=Math.cos(t),s=Math.sin(t);return this.set(1,0,0,0,0,n,-s,0,0,s,n,0,0,0,0,1),this}makeRotationY(t){const n=Math.cos(t),s=Math.sin(t);return this.set(n,0,s,0,0,1,0,0,-s,0,n,0,0,0,0,1),this}makeRotationZ(t){const n=Math.cos(t),s=Math.sin(t);return this.set(n,-s,0,0,s,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,n){const s=Math.cos(n),l=Math.sin(n),c=1-s,f=t.x,d=t.y,m=t.z,p=c*f,x=c*d;return this.set(p*f+s,p*d-l*m,p*m+l*d,0,p*d+l*m,x*d+s,x*m-l*f,0,p*m-l*d,x*m+l*f,c*m*m+s,0,0,0,0,1),this}makeScale(t,n,s){return this.set(t,0,0,0,0,n,0,0,0,0,s,0,0,0,0,1),this}makeShear(t,n,s,l,c,f){return this.set(1,s,c,0,t,1,f,0,n,l,1,0,0,0,0,1),this}compose(t,n,s){const l=this.elements,c=n._x,f=n._y,d=n._z,m=n._w,p=c+c,x=f+f,g=d+d,_=c*p,S=c*x,b=c*g,A=f*x,M=f*g,y=d*g,z=m*p,w=m*x,O=m*g,k=s.x,P=s.y,F=s.z;return l[0]=(1-(A+y))*k,l[1]=(S+O)*k,l[2]=(b-w)*k,l[3]=0,l[4]=(S-O)*P,l[5]=(1-(_+y))*P,l[6]=(M+z)*P,l[7]=0,l[8]=(b+w)*F,l[9]=(M-z)*F,l[10]=(1-(_+A))*F,l[11]=0,l[12]=t.x,l[13]=t.y,l[14]=t.z,l[15]=1,this}decompose(t,n,s){const l=this.elements;let c=vr.set(l[0],l[1],l[2]).length();const f=vr.set(l[4],l[5],l[6]).length(),d=vr.set(l[8],l[9],l[10]).length();this.determinant()<0&&(c=-c),t.x=l[12],t.y=l[13],t.z=l[14],Ai.copy(this);const p=1/c,x=1/f,g=1/d;return Ai.elements[0]*=p,Ai.elements[1]*=p,Ai.elements[2]*=p,Ai.elements[4]*=x,Ai.elements[5]*=x,Ai.elements[6]*=x,Ai.elements[8]*=g,Ai.elements[9]*=g,Ai.elements[10]*=g,n.setFromRotationMatrix(Ai),s.x=c,s.y=f,s.z=d,this}makePerspective(t,n,s,l,c,f,d=zi,m=!1){const p=this.elements,x=2*c/(n-t),g=2*c/(s-l),_=(n+t)/(n-t),S=(s+l)/(s-l);let b,A;if(m)b=c/(f-c),A=f*c/(f-c);else if(d===zi)b=-(f+c)/(f-c),A=-2*f*c/(f-c);else if(d===eu)b=-f/(f-c),A=-f*c/(f-c);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return p[0]=x,p[4]=0,p[8]=_,p[12]=0,p[1]=0,p[5]=g,p[9]=S,p[13]=0,p[2]=0,p[6]=0,p[10]=b,p[14]=A,p[3]=0,p[7]=0,p[11]=-1,p[15]=0,this}makeOrthographic(t,n,s,l,c,f,d=zi,m=!1){const p=this.elements,x=2/(n-t),g=2/(s-l),_=-(n+t)/(n-t),S=-(s+l)/(s-l);let b,A;if(m)b=1/(f-c),A=f/(f-c);else if(d===zi)b=-2/(f-c),A=-(f+c)/(f-c);else if(d===eu)b=-1/(f-c),A=-c/(f-c);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return p[0]=x,p[4]=0,p[8]=0,p[12]=_,p[1]=0,p[5]=g,p[9]=0,p[13]=S,p[2]=0,p[6]=0,p[10]=b,p[14]=A,p[3]=0,p[7]=0,p[11]=0,p[15]=1,this}equals(t){const n=this.elements,s=t.elements;for(let l=0;l<16;l++)if(n[l]!==s[l])return!1;return!0}fromArray(t,n=0){for(let s=0;s<16;s++)this.elements[s]=t[s+n];return this}toArray(t=[],n=0){const s=this.elements;return t[n]=s[0],t[n+1]=s[1],t[n+2]=s[2],t[n+3]=s[3],t[n+4]=s[4],t[n+5]=s[5],t[n+6]=s[6],t[n+7]=s[7],t[n+8]=s[8],t[n+9]=s[9],t[n+10]=s[10],t[n+11]=s[11],t[n+12]=s[12],t[n+13]=s[13],t[n+14]=s[14],t[n+15]=s[15],t}}const vr=new Y,Ai=new tn,_M=new Y(0,0,0),vM=new Y(1,1,1),Za=new Y,Ec=new Y,si=new Y,vg=new tn,yg=new is;class Ii{constructor(t=0,n=0,s=0,l=Ii.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=s,this._order=l}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,n,s,l=this._order){return this._x=t,this._y=n,this._z=s,this._order=l,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,n=this._order,s=!0){const l=t.elements,c=l[0],f=l[4],d=l[8],m=l[1],p=l[5],x=l[9],g=l[2],_=l[6],S=l[10];switch(n){case"XYZ":this._y=Math.asin(ye(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-x,S),this._z=Math.atan2(-f,c)):(this._x=Math.atan2(_,p),this._z=0);break;case"YXZ":this._x=Math.asin(-ye(x,-1,1)),Math.abs(x)<.9999999?(this._y=Math.atan2(d,S),this._z=Math.atan2(m,p)):(this._y=Math.atan2(-g,c),this._z=0);break;case"ZXY":this._x=Math.asin(ye(_,-1,1)),Math.abs(_)<.9999999?(this._y=Math.atan2(-g,S),this._z=Math.atan2(-f,p)):(this._y=0,this._z=Math.atan2(m,c));break;case"ZYX":this._y=Math.asin(-ye(g,-1,1)),Math.abs(g)<.9999999?(this._x=Math.atan2(_,S),this._z=Math.atan2(m,c)):(this._x=0,this._z=Math.atan2(-f,p));break;case"YZX":this._z=Math.asin(ye(m,-1,1)),Math.abs(m)<.9999999?(this._x=Math.atan2(-x,p),this._y=Math.atan2(-g,c)):(this._x=0,this._y=Math.atan2(d,S));break;case"XZY":this._z=Math.asin(-ye(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(_,p),this._y=Math.atan2(d,c)):(this._x=Math.atan2(-x,S),this._y=0);break;default:fe("Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,s===!0&&this._onChangeCallback(),this}setFromQuaternion(t,n,s){return vg.makeRotationFromQuaternion(t),this.setFromRotationMatrix(vg,n,s)}setFromVector3(t,n=this._order){return this.set(t.x,t.y,t.z,n)}reorder(t){return yg.setFromEuler(this),this.setFromQuaternion(yg,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Ii.DEFAULT_ORDER="XYZ";class L_{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let yM=0;const Sg=new Y,yr=new is,ua=new tn,Tc=new Y,Vo=new Y,SM=new Y,MM=new is,Mg=new Y(1,0,0),bg=new Y(0,1,0),Eg=new Y(0,0,1),Tg={type:"added"},bM={type:"removed"},Sr={type:"childadded",child:null},Bh={type:"childremoved",child:null};class Un extends Ps{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:yM++}),this.uuid=Hr(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Un.DEFAULT_UP.clone();const t=new Y,n=new Ii,s=new is,l=new Y(1,1,1);function c(){s.setFromEuler(n,!1)}function f(){n.setFromQuaternion(s,void 0,!1)}n._onChange(c),s._onChange(f),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:s},scale:{configurable:!0,enumerable:!0,value:l},modelViewMatrix:{value:new tn},normalMatrix:{value:new _e}}),this.matrix=new tn,this.matrixWorld=new tn,this.matrixAutoUpdate=Un.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Un.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new L_,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,n){this.quaternion.setFromAxisAngle(t,n)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,n){return yr.setFromAxisAngle(t,n),this.quaternion.multiply(yr),this}rotateOnWorldAxis(t,n){return yr.setFromAxisAngle(t,n),this.quaternion.premultiply(yr),this}rotateX(t){return this.rotateOnAxis(Mg,t)}rotateY(t){return this.rotateOnAxis(bg,t)}rotateZ(t){return this.rotateOnAxis(Eg,t)}translateOnAxis(t,n){return Sg.copy(t).applyQuaternion(this.quaternion),this.position.add(Sg.multiplyScalar(n)),this}translateX(t){return this.translateOnAxis(Mg,t)}translateY(t){return this.translateOnAxis(bg,t)}translateZ(t){return this.translateOnAxis(Eg,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(ua.copy(this.matrixWorld).invert())}lookAt(t,n,s){t.isVector3?Tc.copy(t):Tc.set(t,n,s);const l=this.parent;this.updateWorldMatrix(!0,!1),Vo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ua.lookAt(Vo,Tc,this.up):ua.lookAt(Tc,Vo,this.up),this.quaternion.setFromRotationMatrix(ua),l&&(ua.extractRotation(l.matrixWorld),yr.setFromRotationMatrix(ua),this.quaternion.premultiply(yr.invert()))}add(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return t===this?(an("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Tg),Sr.child=t,this.dispatchEvent(Sr),Sr.child=null):an("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let s=0;s<arguments.length;s++)this.remove(arguments[s]);return this}const n=this.children.indexOf(t);return n!==-1&&(t.parent=null,this.children.splice(n,1),t.dispatchEvent(bM),Bh.child=t,this.dispatchEvent(Bh),Bh.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),ua.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),ua.multiply(t.parent.matrixWorld)),t.applyMatrix4(ua),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Tg),Sr.child=t,this.dispatchEvent(Sr),Sr.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,n){if(this[t]===n)return this;for(let s=0,l=this.children.length;s<l;s++){const f=this.children[s].getObjectByProperty(t,n);if(f!==void 0)return f}}getObjectsByProperty(t,n,s=[]){this[t]===n&&s.push(this);const l=this.children;for(let c=0,f=l.length;c<f;c++)l[c].getObjectsByProperty(t,n,s);return s}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Vo,t,SM),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Vo,MM,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const n=this.matrixWorld.elements;return t.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(t){t(this);const n=this.children;for(let s=0,l=n.length;s<l;s++)n[s].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const n=this.children;for(let s=0,l=n.length;s<l;s++)n[s].traverseVisible(t)}traverseAncestors(t){const n=this.parent;n!==null&&(t(n),n.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const n=this.children;for(let s=0,l=n.length;s<l;s++)n[s].updateMatrixWorld(t)}updateWorldMatrix(t,n){const s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),n===!0){const l=this.children;for(let c=0,f=l.length;c<f;c++)l[c].updateWorldMatrix(!1,!0)}}toJSON(t){const n=t===void 0||typeof t=="string",s={};n&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},s.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const l={};l.uuid=this.uuid,l.type=this.type,this.name!==""&&(l.name=this.name),this.castShadow===!0&&(l.castShadow=!0),this.receiveShadow===!0&&(l.receiveShadow=!0),this.visible===!1&&(l.visible=!1),this.frustumCulled===!1&&(l.frustumCulled=!1),this.renderOrder!==0&&(l.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(l.userData=this.userData),l.layers=this.layers.mask,l.matrix=this.matrix.toArray(),l.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(l.matrixAutoUpdate=!1),this.isInstancedMesh&&(l.type="InstancedMesh",l.count=this.count,l.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(l.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(l.type="BatchedMesh",l.perObjectFrustumCulled=this.perObjectFrustumCulled,l.sortObjects=this.sortObjects,l.drawRanges=this._drawRanges,l.reservedRanges=this._reservedRanges,l.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),l.instanceInfo=this._instanceInfo.map(d=>({...d})),l.availableInstanceIds=this._availableInstanceIds.slice(),l.availableGeometryIds=this._availableGeometryIds.slice(),l.nextIndexStart=this._nextIndexStart,l.nextVertexStart=this._nextVertexStart,l.geometryCount=this._geometryCount,l.maxInstanceCount=this._maxInstanceCount,l.maxVertexCount=this._maxVertexCount,l.maxIndexCount=this._maxIndexCount,l.geometryInitialized=this._geometryInitialized,l.matricesTexture=this._matricesTexture.toJSON(t),l.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(l.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(l.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(l.boundingBox=this.boundingBox.toJSON()));function c(d,m){return d[m.uuid]===void 0&&(d[m.uuid]=m.toJSON(t)),m.uuid}if(this.isScene)this.background&&(this.background.isColor?l.background=this.background.toJSON():this.background.isTexture&&(l.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(l.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){l.geometry=c(t.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const m=d.shapes;if(Array.isArray(m))for(let p=0,x=m.length;p<x;p++){const g=m[p];c(t.shapes,g)}else c(t.shapes,m)}}if(this.isSkinnedMesh&&(l.bindMode=this.bindMode,l.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(c(t.skeletons,this.skeleton),l.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let m=0,p=this.material.length;m<p;m++)d.push(c(t.materials,this.material[m]));l.material=d}else l.material=c(t.materials,this.material);if(this.children.length>0){l.children=[];for(let d=0;d<this.children.length;d++)l.children.push(this.children[d].toJSON(t).object)}if(this.animations.length>0){l.animations=[];for(let d=0;d<this.animations.length;d++){const m=this.animations[d];l.animations.push(c(t.animations,m))}}if(n){const d=f(t.geometries),m=f(t.materials),p=f(t.textures),x=f(t.images),g=f(t.shapes),_=f(t.skeletons),S=f(t.animations),b=f(t.nodes);d.length>0&&(s.geometries=d),m.length>0&&(s.materials=m),p.length>0&&(s.textures=p),x.length>0&&(s.images=x),g.length>0&&(s.shapes=g),_.length>0&&(s.skeletons=_),S.length>0&&(s.animations=S),b.length>0&&(s.nodes=b)}return s.object=l,s;function f(d){const m=[];for(const p in d){const x=d[p];delete x.metadata,m.push(x)}return m}}clone(t){return new this.constructor().copy(this,t)}copy(t,n=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),n===!0)for(let s=0;s<t.children.length;s++){const l=t.children[s];this.add(l.clone())}return this}}Un.DEFAULT_UP=new Y(0,1,0);Un.DEFAULT_MATRIX_AUTO_UPDATE=!0;Un.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Ri=new Y,fa=new Y,Fh=new Y,ha=new Y,Mr=new Y,br=new Y,Ag=new Y,Ih=new Y,Hh=new Y,Gh=new Y,Vh=new sn,kh=new sn,Xh=new sn;class vi{constructor(t=new Y,n=new Y,s=new Y){this.a=t,this.b=n,this.c=s}static getNormal(t,n,s,l){l.subVectors(s,n),Ri.subVectors(t,n),l.cross(Ri);const c=l.lengthSq();return c>0?l.multiplyScalar(1/Math.sqrt(c)):l.set(0,0,0)}static getBarycoord(t,n,s,l,c){Ri.subVectors(l,n),fa.subVectors(s,n),Fh.subVectors(t,n);const f=Ri.dot(Ri),d=Ri.dot(fa),m=Ri.dot(Fh),p=fa.dot(fa),x=fa.dot(Fh),g=f*p-d*d;if(g===0)return c.set(0,0,0),null;const _=1/g,S=(p*m-d*x)*_,b=(f*x-d*m)*_;return c.set(1-S-b,b,S)}static containsPoint(t,n,s,l){return this.getBarycoord(t,n,s,l,ha)===null?!1:ha.x>=0&&ha.y>=0&&ha.x+ha.y<=1}static getInterpolation(t,n,s,l,c,f,d,m){return this.getBarycoord(t,n,s,l,ha)===null?(m.x=0,m.y=0,"z"in m&&(m.z=0),"w"in m&&(m.w=0),null):(m.setScalar(0),m.addScaledVector(c,ha.x),m.addScaledVector(f,ha.y),m.addScaledVector(d,ha.z),m)}static getInterpolatedAttribute(t,n,s,l,c,f){return Vh.setScalar(0),kh.setScalar(0),Xh.setScalar(0),Vh.fromBufferAttribute(t,n),kh.fromBufferAttribute(t,s),Xh.fromBufferAttribute(t,l),f.setScalar(0),f.addScaledVector(Vh,c.x),f.addScaledVector(kh,c.y),f.addScaledVector(Xh,c.z),f}static isFrontFacing(t,n,s,l){return Ri.subVectors(s,n),fa.subVectors(t,n),Ri.cross(fa).dot(l)<0}set(t,n,s){return this.a.copy(t),this.b.copy(n),this.c.copy(s),this}setFromPointsAndIndices(t,n,s,l){return this.a.copy(t[n]),this.b.copy(t[s]),this.c.copy(t[l]),this}setFromAttributeAndIndices(t,n,s,l){return this.a.fromBufferAttribute(t,n),this.b.fromBufferAttribute(t,s),this.c.fromBufferAttribute(t,l),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Ri.subVectors(this.c,this.b),fa.subVectors(this.a,this.b),Ri.cross(fa).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return vi.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return vi.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,s,l,c){return vi.getInterpolation(t,this.a,this.b,this.c,n,s,l,c)}containsPoint(t){return vi.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return vi.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,n){const s=this.a,l=this.b,c=this.c;let f,d;Mr.subVectors(l,s),br.subVectors(c,s),Ih.subVectors(t,s);const m=Mr.dot(Ih),p=br.dot(Ih);if(m<=0&&p<=0)return n.copy(s);Hh.subVectors(t,l);const x=Mr.dot(Hh),g=br.dot(Hh);if(x>=0&&g<=x)return n.copy(l);const _=m*g-x*p;if(_<=0&&m>=0&&x<=0)return f=m/(m-x),n.copy(s).addScaledVector(Mr,f);Gh.subVectors(t,c);const S=Mr.dot(Gh),b=br.dot(Gh);if(b>=0&&S<=b)return n.copy(c);const A=S*p-m*b;if(A<=0&&p>=0&&b<=0)return d=p/(p-b),n.copy(s).addScaledVector(br,d);const M=x*b-S*g;if(M<=0&&g-x>=0&&S-b>=0)return Ag.subVectors(c,l),d=(g-x)/(g-x+(S-b)),n.copy(l).addScaledVector(Ag,d);const y=1/(M+A+_);return f=A*y,d=_*y,n.copy(s).addScaledVector(Mr,f).addScaledVector(br,d)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const N_={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ka={h:0,s:0,l:0},Ac={h:0,s:0,l:0};function Wh(r,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?r+(t-r)*6*n:n<1/2?t:n<2/3?r+(t-r)*6*(2/3-n):r}class Te{constructor(t,n,s){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,n,s)}set(t,n,s){if(n===void 0&&s===void 0){const l=t;l&&l.isColor?this.copy(l):typeof l=="number"?this.setHex(l):typeof l=="string"&&this.setStyle(l)}else this.setRGB(t,n,s);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,n=gi){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Oe.colorSpaceToWorking(this,n),this}setRGB(t,n,s,l=Oe.workingColorSpace){return this.r=t,this.g=n,this.b=s,Oe.colorSpaceToWorking(this,l),this}setHSL(t,n,s,l=Oe.workingColorSpace){if(t=cM(t,1),n=ye(n,0,1),s=ye(s,0,1),n===0)this.r=this.g=this.b=s;else{const c=s<=.5?s*(1+n):s+n-s*n,f=2*s-c;this.r=Wh(f,c,t+1/3),this.g=Wh(f,c,t),this.b=Wh(f,c,t-1/3)}return Oe.colorSpaceToWorking(this,l),this}setStyle(t,n=gi){function s(c){c!==void 0&&parseFloat(c)<1&&fe("Color: Alpha component of "+t+" will be ignored.")}let l;if(l=/^(\w+)\(([^\)]*)\)/.exec(t)){let c;const f=l[1],d=l[2];switch(f){case"rgb":case"rgba":if(c=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return s(c[4]),this.setRGB(Math.min(255,parseInt(c[1],10))/255,Math.min(255,parseInt(c[2],10))/255,Math.min(255,parseInt(c[3],10))/255,n);if(c=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return s(c[4]),this.setRGB(Math.min(100,parseInt(c[1],10))/100,Math.min(100,parseInt(c[2],10))/100,Math.min(100,parseInt(c[3],10))/100,n);break;case"hsl":case"hsla":if(c=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return s(c[4]),this.setHSL(parseFloat(c[1])/360,parseFloat(c[2])/100,parseFloat(c[3])/100,n);break;default:fe("Color: Unknown color model "+t)}}else if(l=/^\#([A-Fa-f\d]+)$/.exec(t)){const c=l[1],f=c.length;if(f===3)return this.setRGB(parseInt(c.charAt(0),16)/15,parseInt(c.charAt(1),16)/15,parseInt(c.charAt(2),16)/15,n);if(f===6)return this.setHex(parseInt(c,16),n);fe("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,n);return this}setColorName(t,n=gi){const s=N_[t.toLowerCase()];return s!==void 0?this.setHex(s,n):fe("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=va(t.r),this.g=va(t.g),this.b=va(t.b),this}copyLinearToSRGB(t){return this.r=Lr(t.r),this.g=Lr(t.g),this.b=Lr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=gi){return Oe.workingToColorSpace(Pn.copy(this),t),Math.round(ye(Pn.r*255,0,255))*65536+Math.round(ye(Pn.g*255,0,255))*256+Math.round(ye(Pn.b*255,0,255))}getHexString(t=gi){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,n=Oe.workingColorSpace){Oe.workingToColorSpace(Pn.copy(this),n);const s=Pn.r,l=Pn.g,c=Pn.b,f=Math.max(s,l,c),d=Math.min(s,l,c);let m,p;const x=(d+f)/2;if(d===f)m=0,p=0;else{const g=f-d;switch(p=x<=.5?g/(f+d):g/(2-f-d),f){case s:m=(l-c)/g+(l<c?6:0);break;case l:m=(c-s)/g+2;break;case c:m=(s-l)/g+4;break}m/=6}return t.h=m,t.s=p,t.l=x,t}getRGB(t,n=Oe.workingColorSpace){return Oe.workingToColorSpace(Pn.copy(this),n),t.r=Pn.r,t.g=Pn.g,t.b=Pn.b,t}getStyle(t=gi){Oe.workingToColorSpace(Pn.copy(this),t);const n=Pn.r,s=Pn.g,l=Pn.b;return t!==gi?`color(${t} ${n.toFixed(3)} ${s.toFixed(3)} ${l.toFixed(3)})`:`rgb(${Math.round(n*255)},${Math.round(s*255)},${Math.round(l*255)})`}offsetHSL(t,n,s){return this.getHSL(Ka),this.setHSL(Ka.h+t,Ka.s+n,Ka.l+s)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,n){return this.r=t.r+n.r,this.g=t.g+n.g,this.b=t.b+n.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,n){return this.r+=(t.r-this.r)*n,this.g+=(t.g-this.g)*n,this.b+=(t.b-this.b)*n,this}lerpColors(t,n,s){return this.r=t.r+(n.r-t.r)*s,this.g=t.g+(n.g-t.g)*s,this.b=t.b+(n.b-t.b)*s,this}lerpHSL(t,n){this.getHSL(Ka),t.getHSL(Ac);const s=Rh(Ka.h,Ac.h,n),l=Rh(Ka.s,Ac.s,n),c=Rh(Ka.l,Ac.l,n);return this.setHSL(s,l,c),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const n=this.r,s=this.g,l=this.b,c=t.elements;return this.r=c[0]*n+c[3]*s+c[6]*l,this.g=c[1]*n+c[4]*s+c[7]*l,this.b=c[2]*n+c[5]*s+c[8]*l,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,n=0){return this.r=t[n],this.g=t[n+1],this.b=t[n+2],this}toArray(t=[],n=0){return t[n]=this.r,t[n+1]=this.g,t[n+2]=this.b,t}fromBufferAttribute(t,n){return this.r=t.getX(n),this.g=t.getY(n),this.b=t.getZ(n),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Pn=new Te;Te.NAMES=N_;let EM=0;class Gr extends Ps{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:EM++}),this.uuid=Hr(),this.name="",this.type="Material",this.blending=Ur,this.side=ns,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=ld,this.blendDst=cd,this.blendEquation=ws,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Te(0,0,0),this.blendAlpha=0,this.depthFunc=Nr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=fg,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=pr,this.stencilZFail=pr,this.stencilZPass=pr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const n in t){const s=t[n];if(s===void 0){fe(`Material: parameter '${n}' has value of undefined.`);continue}const l=this[n];if(l===void 0){fe(`Material: '${n}' is not a property of THREE.${this.type}.`);continue}l&&l.isColor?l.set(s):l&&l.isVector3&&s&&s.isVector3?l.copy(s):this[n]=s}}toJSON(t){const n=t===void 0||typeof t=="string";n&&(t={textures:{},images:{}});const s={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.color&&this.color.isColor&&(s.color=this.color.getHex()),this.roughness!==void 0&&(s.roughness=this.roughness),this.metalness!==void 0&&(s.metalness=this.metalness),this.sheen!==void 0&&(s.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(s.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(s.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(s.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(s.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(s.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(s.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(s.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(s.shininess=this.shininess),this.clearcoat!==void 0&&(s.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(s.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(s.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(s.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(s.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,s.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(s.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(s.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(s.dispersion=this.dispersion),this.iridescence!==void 0&&(s.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(s.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(s.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(s.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(s.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(s.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(s.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(s.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(s.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(s.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(s.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(s.lightMap=this.lightMap.toJSON(t).uuid,s.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(s.aoMap=this.aoMap.toJSON(t).uuid,s.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(s.bumpMap=this.bumpMap.toJSON(t).uuid,s.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(s.normalMap=this.normalMap.toJSON(t).uuid,s.normalMapType=this.normalMapType,s.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(s.displacementMap=this.displacementMap.toJSON(t).uuid,s.displacementScale=this.displacementScale,s.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(s.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(s.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(s.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(s.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(s.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(s.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(s.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(s.combine=this.combine)),this.envMapRotation!==void 0&&(s.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(s.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(s.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(s.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(s.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(s.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(s.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(s.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(s.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(s.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(s.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(s.size=this.size),this.shadowSide!==null&&(s.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(s.sizeAttenuation=this.sizeAttenuation),this.blending!==Ur&&(s.blending=this.blending),this.side!==ns&&(s.side=this.side),this.vertexColors===!0&&(s.vertexColors=!0),this.opacity<1&&(s.opacity=this.opacity),this.transparent===!0&&(s.transparent=!0),this.blendSrc!==ld&&(s.blendSrc=this.blendSrc),this.blendDst!==cd&&(s.blendDst=this.blendDst),this.blendEquation!==ws&&(s.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(s.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(s.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(s.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(s.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(s.blendAlpha=this.blendAlpha),this.depthFunc!==Nr&&(s.depthFunc=this.depthFunc),this.depthTest===!1&&(s.depthTest=this.depthTest),this.depthWrite===!1&&(s.depthWrite=this.depthWrite),this.colorWrite===!1&&(s.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(s.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==fg&&(s.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(s.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(s.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==pr&&(s.stencilFail=this.stencilFail),this.stencilZFail!==pr&&(s.stencilZFail=this.stencilZFail),this.stencilZPass!==pr&&(s.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(s.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(s.rotation=this.rotation),this.polygonOffset===!0&&(s.polygonOffset=!0),this.polygonOffsetFactor!==0&&(s.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(s.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(s.linewidth=this.linewidth),this.dashSize!==void 0&&(s.dashSize=this.dashSize),this.gapSize!==void 0&&(s.gapSize=this.gapSize),this.scale!==void 0&&(s.scale=this.scale),this.dithering===!0&&(s.dithering=!0),this.alphaTest>0&&(s.alphaTest=this.alphaTest),this.alphaHash===!0&&(s.alphaHash=!0),this.alphaToCoverage===!0&&(s.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(s.premultipliedAlpha=!0),this.forceSinglePass===!0&&(s.forceSinglePass=!0),this.wireframe===!0&&(s.wireframe=!0),this.wireframeLinewidth>1&&(s.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(s.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(s.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(s.flatShading=!0),this.visible===!1&&(s.visible=!1),this.toneMapped===!1&&(s.toneMapped=!1),this.fog===!1&&(s.fog=!1),Object.keys(this.userData).length>0&&(s.userData=this.userData);function l(c){const f=[];for(const d in c){const m=c[d];delete m.metadata,f.push(m)}return f}if(n){const c=l(t.textures),f=l(t.images);c.length>0&&(s.textures=c),f.length>0&&(s.images=f)}return s}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const n=t.clippingPlanes;let s=null;if(n!==null){const l=n.length;s=new Array(l);for(let c=0;c!==l;++c)s[c]=n[c].clone()}return this.clippingPlanes=s,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class O_ extends Gr{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Te(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ii,this.combine=v_,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const dn=new Y,Rc=new Nt;let TM=0;class Bi{constructor(t,n,s=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:TM++}),this.name="",this.array=t,this.itemSize=n,this.count=t!==void 0?t.length/n:0,this.normalized=s,this.usage=hg,this.updateRanges=[],this.gpuType=ga,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,n,s){t*=this.itemSize,s*=n.itemSize;for(let l=0,c=this.itemSize;l<c;l++)this.array[t+l]=n.array[s+l];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let n=0,s=this.count;n<s;n++)Rc.fromBufferAttribute(this,n),Rc.applyMatrix3(t),this.setXY(n,Rc.x,Rc.y);else if(this.itemSize===3)for(let n=0,s=this.count;n<s;n++)dn.fromBufferAttribute(this,n),dn.applyMatrix3(t),this.setXYZ(n,dn.x,dn.y,dn.z);return this}applyMatrix4(t){for(let n=0,s=this.count;n<s;n++)dn.fromBufferAttribute(this,n),dn.applyMatrix4(t),this.setXYZ(n,dn.x,dn.y,dn.z);return this}applyNormalMatrix(t){for(let n=0,s=this.count;n<s;n++)dn.fromBufferAttribute(this,n),dn.applyNormalMatrix(t),this.setXYZ(n,dn.x,dn.y,dn.z);return this}transformDirection(t){for(let n=0,s=this.count;n<s;n++)dn.fromBufferAttribute(this,n),dn.transformDirection(t),this.setXYZ(n,dn.x,dn.y,dn.z);return this}set(t,n=0){return this.array.set(t,n),this}getComponent(t,n){let s=this.array[t*this.itemSize+n];return this.normalized&&(s=Io(s,this.array)),s}setComponent(t,n,s){return this.normalized&&(s=qn(s,this.array)),this.array[t*this.itemSize+n]=s,this}getX(t){let n=this.array[t*this.itemSize];return this.normalized&&(n=Io(n,this.array)),n}setX(t,n){return this.normalized&&(n=qn(n,this.array)),this.array[t*this.itemSize]=n,this}getY(t){let n=this.array[t*this.itemSize+1];return this.normalized&&(n=Io(n,this.array)),n}setY(t,n){return this.normalized&&(n=qn(n,this.array)),this.array[t*this.itemSize+1]=n,this}getZ(t){let n=this.array[t*this.itemSize+2];return this.normalized&&(n=Io(n,this.array)),n}setZ(t,n){return this.normalized&&(n=qn(n,this.array)),this.array[t*this.itemSize+2]=n,this}getW(t){let n=this.array[t*this.itemSize+3];return this.normalized&&(n=Io(n,this.array)),n}setW(t,n){return this.normalized&&(n=qn(n,this.array)),this.array[t*this.itemSize+3]=n,this}setXY(t,n,s){return t*=this.itemSize,this.normalized&&(n=qn(n,this.array),s=qn(s,this.array)),this.array[t+0]=n,this.array[t+1]=s,this}setXYZ(t,n,s,l){return t*=this.itemSize,this.normalized&&(n=qn(n,this.array),s=qn(s,this.array),l=qn(l,this.array)),this.array[t+0]=n,this.array[t+1]=s,this.array[t+2]=l,this}setXYZW(t,n,s,l,c){return t*=this.itemSize,this.normalized&&(n=qn(n,this.array),s=qn(s,this.array),l=qn(l,this.array),c=qn(c,this.array)),this.array[t+0]=n,this.array[t+1]=s,this.array[t+2]=l,this.array[t+3]=c,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==hg&&(t.usage=this.usage),t}}class P_ extends Bi{constructor(t,n,s){super(new Uint16Array(t),n,s)}}class z_ extends Bi{constructor(t,n,s){super(new Uint32Array(t),n,s)}}class Tn extends Bi{constructor(t,n,s){super(new Float32Array(t),n,s)}}let AM=0;const xi=new tn,qh=new Un,Er=new Y,ri=new rl,ko=new rl,En=new Y;class Zn extends Ps{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:AM++}),this.uuid=Hr(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(D_(t)?z_:P_)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,n){return this.attributes[t]=n,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,n,s=0){this.groups.push({start:t,count:n,materialIndex:s})}clearGroups(){this.groups=[]}setDrawRange(t,n){this.drawRange.start=t,this.drawRange.count=n}applyMatrix4(t){const n=this.attributes.position;n!==void 0&&(n.applyMatrix4(t),n.needsUpdate=!0);const s=this.attributes.normal;if(s!==void 0){const c=new _e().getNormalMatrix(t);s.applyNormalMatrix(c),s.needsUpdate=!0}const l=this.attributes.tangent;return l!==void 0&&(l.transformDirection(t),l.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return xi.makeRotationFromQuaternion(t),this.applyMatrix4(xi),this}rotateX(t){return xi.makeRotationX(t),this.applyMatrix4(xi),this}rotateY(t){return xi.makeRotationY(t),this.applyMatrix4(xi),this}rotateZ(t){return xi.makeRotationZ(t),this.applyMatrix4(xi),this}translate(t,n,s){return xi.makeTranslation(t,n,s),this.applyMatrix4(xi),this}scale(t,n,s){return xi.makeScale(t,n,s),this.applyMatrix4(xi),this}lookAt(t){return qh.lookAt(t),qh.updateMatrix(),this.applyMatrix4(qh.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Er).negate(),this.translate(Er.x,Er.y,Er.z),this}setFromPoints(t){const n=this.getAttribute("position");if(n===void 0){const s=[];for(let l=0,c=t.length;l<c;l++){const f=t[l];s.push(f.x,f.y,f.z||0)}this.setAttribute("position",new Tn(s,3))}else{const s=Math.min(t.length,n.count);for(let l=0;l<s;l++){const c=t[l];n.setXYZ(l,c.x,c.y,c.z||0)}t.length>n.count&&fe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),n.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new rl);const t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){an("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new Y(-1/0,-1/0,-1/0),new Y(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),n)for(let s=0,l=n.length;s<l;s++){const c=n[s];ri.setFromBufferAttribute(c),this.morphTargetsRelative?(En.addVectors(this.boundingBox.min,ri.min),this.boundingBox.expandByPoint(En),En.addVectors(this.boundingBox.max,ri.max),this.boundingBox.expandByPoint(En)):(this.boundingBox.expandByPoint(ri.min),this.boundingBox.expandByPoint(ri.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&an('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ou);const t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){an("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new Y,1/0);return}if(t){const s=this.boundingSphere.center;if(ri.setFromBufferAttribute(t),n)for(let c=0,f=n.length;c<f;c++){const d=n[c];ko.setFromBufferAttribute(d),this.morphTargetsRelative?(En.addVectors(ri.min,ko.min),ri.expandByPoint(En),En.addVectors(ri.max,ko.max),ri.expandByPoint(En)):(ri.expandByPoint(ko.min),ri.expandByPoint(ko.max))}ri.getCenter(s);let l=0;for(let c=0,f=t.count;c<f;c++)En.fromBufferAttribute(t,c),l=Math.max(l,s.distanceToSquared(En));if(n)for(let c=0,f=n.length;c<f;c++){const d=n[c],m=this.morphTargetsRelative;for(let p=0,x=d.count;p<x;p++)En.fromBufferAttribute(d,p),m&&(Er.fromBufferAttribute(t,p),En.add(Er)),l=Math.max(l,s.distanceToSquared(En))}this.boundingSphere.radius=Math.sqrt(l),isNaN(this.boundingSphere.radius)&&an('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,n=this.attributes;if(t===null||n.position===void 0||n.normal===void 0||n.uv===void 0){an("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const s=n.position,l=n.normal,c=n.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Bi(new Float32Array(4*s.count),4));const f=this.getAttribute("tangent"),d=[],m=[];for(let Q=0;Q<s.count;Q++)d[Q]=new Y,m[Q]=new Y;const p=new Y,x=new Y,g=new Y,_=new Nt,S=new Nt,b=new Nt,A=new Y,M=new Y;function y(Q,D,C){p.fromBufferAttribute(s,Q),x.fromBufferAttribute(s,D),g.fromBufferAttribute(s,C),_.fromBufferAttribute(c,Q),S.fromBufferAttribute(c,D),b.fromBufferAttribute(c,C),x.sub(p),g.sub(p),S.sub(_),b.sub(_);const H=1/(S.x*b.y-b.x*S.y);isFinite(H)&&(A.copy(x).multiplyScalar(b.y).addScaledVector(g,-S.y).multiplyScalar(H),M.copy(g).multiplyScalar(S.x).addScaledVector(x,-b.x).multiplyScalar(H),d[Q].add(A),d[D].add(A),d[C].add(A),m[Q].add(M),m[D].add(M),m[C].add(M))}let z=this.groups;z.length===0&&(z=[{start:0,count:t.count}]);for(let Q=0,D=z.length;Q<D;++Q){const C=z[Q],H=C.start,nt=C.count;for(let ct=H,pt=H+nt;ct<pt;ct+=3)y(t.getX(ct+0),t.getX(ct+1),t.getX(ct+2))}const w=new Y,O=new Y,k=new Y,P=new Y;function F(Q){k.fromBufferAttribute(l,Q),P.copy(k);const D=d[Q];w.copy(D),w.sub(k.multiplyScalar(k.dot(D))).normalize(),O.crossVectors(P,D);const H=O.dot(m[Q])<0?-1:1;f.setXYZW(Q,w.x,w.y,w.z,H)}for(let Q=0,D=z.length;Q<D;++Q){const C=z[Q],H=C.start,nt=C.count;for(let ct=H,pt=H+nt;ct<pt;ct+=3)F(t.getX(ct+0)),F(t.getX(ct+1)),F(t.getX(ct+2))}}computeVertexNormals(){const t=this.index,n=this.getAttribute("position");if(n!==void 0){let s=this.getAttribute("normal");if(s===void 0)s=new Bi(new Float32Array(n.count*3),3),this.setAttribute("normal",s);else for(let _=0,S=s.count;_<S;_++)s.setXYZ(_,0,0,0);const l=new Y,c=new Y,f=new Y,d=new Y,m=new Y,p=new Y,x=new Y,g=new Y;if(t)for(let _=0,S=t.count;_<S;_+=3){const b=t.getX(_+0),A=t.getX(_+1),M=t.getX(_+2);l.fromBufferAttribute(n,b),c.fromBufferAttribute(n,A),f.fromBufferAttribute(n,M),x.subVectors(f,c),g.subVectors(l,c),x.cross(g),d.fromBufferAttribute(s,b),m.fromBufferAttribute(s,A),p.fromBufferAttribute(s,M),d.add(x),m.add(x),p.add(x),s.setXYZ(b,d.x,d.y,d.z),s.setXYZ(A,m.x,m.y,m.z),s.setXYZ(M,p.x,p.y,p.z)}else for(let _=0,S=n.count;_<S;_+=3)l.fromBufferAttribute(n,_+0),c.fromBufferAttribute(n,_+1),f.fromBufferAttribute(n,_+2),x.subVectors(f,c),g.subVectors(l,c),x.cross(g),s.setXYZ(_+0,x.x,x.y,x.z),s.setXYZ(_+1,x.x,x.y,x.z),s.setXYZ(_+2,x.x,x.y,x.z);this.normalizeNormals(),s.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let n=0,s=t.count;n<s;n++)En.fromBufferAttribute(t,n),En.normalize(),t.setXYZ(n,En.x,En.y,En.z)}toNonIndexed(){function t(d,m){const p=d.array,x=d.itemSize,g=d.normalized,_=new p.constructor(m.length*x);let S=0,b=0;for(let A=0,M=m.length;A<M;A++){d.isInterleavedBufferAttribute?S=m[A]*d.data.stride+d.offset:S=m[A]*x;for(let y=0;y<x;y++)_[b++]=p[S++]}return new Bi(_,x,g)}if(this.index===null)return fe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const n=new Zn,s=this.index.array,l=this.attributes;for(const d in l){const m=l[d],p=t(m,s);n.setAttribute(d,p)}const c=this.morphAttributes;for(const d in c){const m=[],p=c[d];for(let x=0,g=p.length;x<g;x++){const _=p[x],S=t(_,s);m.push(S)}n.morphAttributes[d]=m}n.morphTargetsRelative=this.morphTargetsRelative;const f=this.groups;for(let d=0,m=f.length;d<m;d++){const p=f[d];n.addGroup(p.start,p.count,p.materialIndex)}return n}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const m=this.parameters;for(const p in m)m[p]!==void 0&&(t[p]=m[p]);return t}t.data={attributes:{}};const n=this.index;n!==null&&(t.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});const s=this.attributes;for(const m in s){const p=s[m];t.data.attributes[m]=p.toJSON(t.data)}const l={};let c=!1;for(const m in this.morphAttributes){const p=this.morphAttributes[m],x=[];for(let g=0,_=p.length;g<_;g++){const S=p[g];x.push(S.toJSON(t.data))}x.length>0&&(l[m]=x,c=!0)}c&&(t.data.morphAttributes=l,t.data.morphTargetsRelative=this.morphTargetsRelative);const f=this.groups;f.length>0&&(t.data.groups=JSON.parse(JSON.stringify(f)));const d=this.boundingSphere;return d!==null&&(t.data.boundingSphere=d.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const n={};this.name=t.name;const s=t.index;s!==null&&this.setIndex(s.clone());const l=t.attributes;for(const p in l){const x=l[p];this.setAttribute(p,x.clone(n))}const c=t.morphAttributes;for(const p in c){const x=[],g=c[p];for(let _=0,S=g.length;_<S;_++)x.push(g[_].clone(n));this.morphAttributes[p]=x}this.morphTargetsRelative=t.morphTargetsRelative;const f=t.groups;for(let p=0,x=f.length;p<x;p++){const g=f[p];this.addGroup(g.start,g.count,g.materialIndex)}const d=t.boundingBox;d!==null&&(this.boundingBox=d.clone());const m=t.boundingSphere;return m!==null&&(this.boundingSphere=m.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Rg=new tn,Es=new fp,Cc=new ou,Cg=new Y,wc=new Y,Dc=new Y,Uc=new Y,Yh=new Y,Lc=new Y,wg=new Y,Nc=new Y;class Hi extends Un{constructor(t=new Zn,n=new O_){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const n=this.geometry.morphAttributes,s=Object.keys(n);if(s.length>0){const l=n[s[0]];if(l!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let c=0,f=l.length;c<f;c++){const d=l[c].name||String(c);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=c}}}}getVertexPosition(t,n){const s=this.geometry,l=s.attributes.position,c=s.morphAttributes.position,f=s.morphTargetsRelative;n.fromBufferAttribute(l,t);const d=this.morphTargetInfluences;if(c&&d){Lc.set(0,0,0);for(let m=0,p=c.length;m<p;m++){const x=d[m],g=c[m];x!==0&&(Yh.fromBufferAttribute(g,t),f?Lc.addScaledVector(Yh,x):Lc.addScaledVector(Yh.sub(n),x))}n.add(Lc)}return n}raycast(t,n){const s=this.geometry,l=this.material,c=this.matrixWorld;l!==void 0&&(s.boundingSphere===null&&s.computeBoundingSphere(),Cc.copy(s.boundingSphere),Cc.applyMatrix4(c),Es.copy(t.ray).recast(t.near),!(Cc.containsPoint(Es.origin)===!1&&(Es.intersectSphere(Cc,Cg)===null||Es.origin.distanceToSquared(Cg)>(t.far-t.near)**2))&&(Rg.copy(c).invert(),Es.copy(t.ray).applyMatrix4(Rg),!(s.boundingBox!==null&&Es.intersectsBox(s.boundingBox)===!1)&&this._computeIntersections(t,n,Es)))}_computeIntersections(t,n,s){let l;const c=this.geometry,f=this.material,d=c.index,m=c.attributes.position,p=c.attributes.uv,x=c.attributes.uv1,g=c.attributes.normal,_=c.groups,S=c.drawRange;if(d!==null)if(Array.isArray(f))for(let b=0,A=_.length;b<A;b++){const M=_[b],y=f[M.materialIndex],z=Math.max(M.start,S.start),w=Math.min(d.count,Math.min(M.start+M.count,S.start+S.count));for(let O=z,k=w;O<k;O+=3){const P=d.getX(O),F=d.getX(O+1),Q=d.getX(O+2);l=Oc(this,y,t,s,p,x,g,P,F,Q),l&&(l.faceIndex=Math.floor(O/3),l.face.materialIndex=M.materialIndex,n.push(l))}}else{const b=Math.max(0,S.start),A=Math.min(d.count,S.start+S.count);for(let M=b,y=A;M<y;M+=3){const z=d.getX(M),w=d.getX(M+1),O=d.getX(M+2);l=Oc(this,f,t,s,p,x,g,z,w,O),l&&(l.faceIndex=Math.floor(M/3),n.push(l))}}else if(m!==void 0)if(Array.isArray(f))for(let b=0,A=_.length;b<A;b++){const M=_[b],y=f[M.materialIndex],z=Math.max(M.start,S.start),w=Math.min(m.count,Math.min(M.start+M.count,S.start+S.count));for(let O=z,k=w;O<k;O+=3){const P=O,F=O+1,Q=O+2;l=Oc(this,y,t,s,p,x,g,P,F,Q),l&&(l.faceIndex=Math.floor(O/3),l.face.materialIndex=M.materialIndex,n.push(l))}}else{const b=Math.max(0,S.start),A=Math.min(m.count,S.start+S.count);for(let M=b,y=A;M<y;M+=3){const z=M,w=M+1,O=M+2;l=Oc(this,f,t,s,p,x,g,z,w,O),l&&(l.faceIndex=Math.floor(M/3),n.push(l))}}}}function RM(r,t,n,s,l,c,f,d){let m;if(t.side===jn?m=s.intersectTriangle(f,c,l,!0,d):m=s.intersectTriangle(l,c,f,t.side===ns,d),m===null)return null;Nc.copy(d),Nc.applyMatrix4(r.matrixWorld);const p=n.ray.origin.distanceTo(Nc);return p<n.near||p>n.far?null:{distance:p,point:Nc.clone(),object:r}}function Oc(r,t,n,s,l,c,f,d,m,p){r.getVertexPosition(d,wc),r.getVertexPosition(m,Dc),r.getVertexPosition(p,Uc);const x=RM(r,t,n,s,wc,Dc,Uc,wg);if(x){const g=new Y;vi.getBarycoord(wg,wc,Dc,Uc,g),l&&(x.uv=vi.getInterpolatedAttribute(l,d,m,p,g,new Nt)),c&&(x.uv1=vi.getInterpolatedAttribute(c,d,m,p,g,new Nt)),f&&(x.normal=vi.getInterpolatedAttribute(f,d,m,p,g,new Y),x.normal.dot(s.direction)>0&&x.normal.multiplyScalar(-1));const _={a:d,b:m,c:p,normal:new Y,materialIndex:0};vi.getNormal(wc,Dc,Uc,_.normal),x.face=_,x.barycoord=g}return x}class Vr extends Zn{constructor(t=1,n=1,s=1,l=1,c=1,f=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:n,depth:s,widthSegments:l,heightSegments:c,depthSegments:f};const d=this;l=Math.floor(l),c=Math.floor(c),f=Math.floor(f);const m=[],p=[],x=[],g=[];let _=0,S=0;b("z","y","x",-1,-1,s,n,t,f,c,0),b("z","y","x",1,-1,s,n,-t,f,c,1),b("x","z","y",1,1,t,s,n,l,f,2),b("x","z","y",1,-1,t,s,-n,l,f,3),b("x","y","z",1,-1,t,n,s,l,c,4),b("x","y","z",-1,-1,t,n,-s,l,c,5),this.setIndex(m),this.setAttribute("position",new Tn(p,3)),this.setAttribute("normal",new Tn(x,3)),this.setAttribute("uv",new Tn(g,2));function b(A,M,y,z,w,O,k,P,F,Q,D){const C=O/F,H=k/Q,nt=O/2,ct=k/2,pt=P/2,lt=F+1,B=Q+1;let q=0,j=0;const xt=new Y;for(let vt=0;vt<B;vt++){const N=vt*H-ct;for(let it=0;it<lt;it++){const _t=it*C-nt;xt[A]=_t*z,xt[M]=N*w,xt[y]=pt,p.push(xt.x,xt.y,xt.z),xt[A]=0,xt[M]=0,xt[y]=P>0?1:-1,x.push(xt.x,xt.y,xt.z),g.push(it/F),g.push(1-vt/Q),q+=1}}for(let vt=0;vt<Q;vt++)for(let N=0;N<F;N++){const it=_+N+lt*vt,_t=_+N+lt*(vt+1),Rt=_+(N+1)+lt*(vt+1),Gt=_+(N+1)+lt*vt;m.push(it,_t,Gt),m.push(_t,Rt,Gt),j+=6}d.addGroup(S,j,D),S+=j,_+=q}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Vr(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function Br(r){const t={};for(const n in r){t[n]={};for(const s in r[n]){const l=r[n][s];l&&(l.isColor||l.isMatrix3||l.isMatrix4||l.isVector2||l.isVector3||l.isVector4||l.isTexture||l.isQuaternion)?l.isRenderTargetTexture?(fe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[n][s]=null):t[n][s]=l.clone():Array.isArray(l)?t[n][s]=l.slice():t[n][s]=l}}return t}function Fn(r){const t={};for(let n=0;n<r.length;n++){const s=Br(r[n]);for(const l in s)t[l]=s[l]}return t}function CM(r){const t=[];for(let n=0;n<r.length;n++)t.push(r[n].clone());return t}function B_(r){const t=r.getRenderTarget();return t===null?r.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Oe.workingColorSpace}const wM={clone:Br,merge:Fn};var DM=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,UM=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ya extends Gr{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=DM,this.fragmentShader=UM,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Br(t.uniforms),this.uniformsGroups=CM(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const n=super.toJSON(t);n.glslVersion=this.glslVersion,n.uniforms={};for(const l in this.uniforms){const f=this.uniforms[l].value;f&&f.isTexture?n.uniforms[l]={type:"t",value:f.toJSON(t).uuid}:f&&f.isColor?n.uniforms[l]={type:"c",value:f.getHex()}:f&&f.isVector2?n.uniforms[l]={type:"v2",value:f.toArray()}:f&&f.isVector3?n.uniforms[l]={type:"v3",value:f.toArray()}:f&&f.isVector4?n.uniforms[l]={type:"v4",value:f.toArray()}:f&&f.isMatrix3?n.uniforms[l]={type:"m3",value:f.toArray()}:f&&f.isMatrix4?n.uniforms[l]={type:"m4",value:f.toArray()}:n.uniforms[l]={value:f}}Object.keys(this.defines).length>0&&(n.defines=this.defines),n.vertexShader=this.vertexShader,n.fragmentShader=this.fragmentShader,n.lights=this.lights,n.clipping=this.clipping;const s={};for(const l in this.extensions)this.extensions[l]===!0&&(s[l]=!0);return Object.keys(s).length>0&&(n.extensions=s),n}}class F_ extends Un{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new tn,this.projectionMatrix=new tn,this.projectionMatrixInverse=new tn,this.coordinateSystem=zi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,n){return super.copy(t,n),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,n){super.updateWorldMatrix(t,n),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Qa=new Y,Dg=new Nt,Ug=new Nt;class _i extends F_{constructor(t=50,n=1,s=.1,l=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=s,this.far=l,this.focus=10,this.aspect=n,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const n=.5*this.getFilmHeight()/t;this.fov=Zd*2*Math.atan(n),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Zo*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Zd*2*Math.atan(Math.tan(Zo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,n,s){Qa.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Qa.x,Qa.y).multiplyScalar(-t/Qa.z),Qa.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),s.set(Qa.x,Qa.y).multiplyScalar(-t/Qa.z)}getViewSize(t,n){return this.getViewBounds(t,Dg,Ug),n.subVectors(Ug,Dg)}setViewOffset(t,n,s,l,c,f){this.aspect=t/n,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=s,this.view.offsetY=l,this.view.width=c,this.view.height=f,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let n=t*Math.tan(Zo*.5*this.fov)/this.zoom,s=2*n,l=this.aspect*s,c=-.5*l;const f=this.view;if(this.view!==null&&this.view.enabled){const m=f.fullWidth,p=f.fullHeight;c+=f.offsetX*l/m,n-=f.offsetY*s/p,l*=f.width/m,s*=f.height/p}const d=this.filmOffset;d!==0&&(c+=t*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(c,c+l,n,n-s,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const n=super.toJSON(t);return n.object.fov=this.fov,n.object.zoom=this.zoom,n.object.near=this.near,n.object.far=this.far,n.object.focus=this.focus,n.object.aspect=this.aspect,this.view!==null&&(n.object.view=Object.assign({},this.view)),n.object.filmGauge=this.filmGauge,n.object.filmOffset=this.filmOffset,n}}const Tr=-90,Ar=1;class LM extends Un{constructor(t,n,s){super(),this.type="CubeCamera",this.renderTarget=s,this.coordinateSystem=null,this.activeMipmapLevel=0;const l=new _i(Tr,Ar,t,n);l.layers=this.layers,this.add(l);const c=new _i(Tr,Ar,t,n);c.layers=this.layers,this.add(c);const f=new _i(Tr,Ar,t,n);f.layers=this.layers,this.add(f);const d=new _i(Tr,Ar,t,n);d.layers=this.layers,this.add(d);const m=new _i(Tr,Ar,t,n);m.layers=this.layers,this.add(m);const p=new _i(Tr,Ar,t,n);p.layers=this.layers,this.add(p)}updateCoordinateSystem(){const t=this.coordinateSystem,n=this.children.concat(),[s,l,c,f,d,m]=n;for(const p of n)this.remove(p);if(t===zi)s.up.set(0,1,0),s.lookAt(1,0,0),l.up.set(0,1,0),l.lookAt(-1,0,0),c.up.set(0,0,-1),c.lookAt(0,1,0),f.up.set(0,0,1),f.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),m.up.set(0,1,0),m.lookAt(0,0,-1);else if(t===eu)s.up.set(0,-1,0),s.lookAt(-1,0,0),l.up.set(0,-1,0),l.lookAt(1,0,0),c.up.set(0,0,1),c.lookAt(0,1,0),f.up.set(0,0,-1),f.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),m.up.set(0,-1,0),m.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const p of n)this.add(p),p.updateMatrixWorld()}update(t,n){this.parent===null&&this.updateMatrixWorld();const{renderTarget:s,activeMipmapLevel:l}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[c,f,d,m,p,x]=this.children,g=t.getRenderTarget(),_=t.getActiveCubeFace(),S=t.getActiveMipmapLevel(),b=t.xr.enabled;t.xr.enabled=!1;const A=s.texture.generateMipmaps;s.texture.generateMipmaps=!1,t.setRenderTarget(s,0,l),t.render(n,c),t.setRenderTarget(s,1,l),t.render(n,f),t.setRenderTarget(s,2,l),t.render(n,d),t.setRenderTarget(s,3,l),t.render(n,m),t.setRenderTarget(s,4,l),t.render(n,p),s.texture.generateMipmaps=A,t.setRenderTarget(s,5,l),t.render(n,x),t.setRenderTarget(g,_,S),t.xr.enabled=b,s.texture.needsPMREMUpdate=!0}}class I_ extends In{constructor(t=[],n=Or,s,l,c,f,d,m,p,x){super(t,n,s,l,c,f,d,m,p,x),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class NM extends Ns{constructor(t=1,n={}){super(t,t,n),this.isWebGLCubeRenderTarget=!0;const s={width:t,height:t,depth:1},l=[s,s,s,s,s,s];this.texture=new I_(l),this._setTextureOptions(n),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;const s={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},l=new Vr(5,5,5),c=new ya({name:"CubemapFromEquirect",uniforms:Br(s.uniforms),vertexShader:s.vertexShader,fragmentShader:s.fragmentShader,side:jn,blending:_a});c.uniforms.tEquirect.value=n;const f=new Hi(l,c),d=n.minFilter;return n.minFilter===Us&&(n.minFilter=yi),new LM(1,10,this).update(t,f),n.minFilter=d,f.geometry.dispose(),f.material.dispose(),this}clear(t,n=!0,s=!0,l=!0){const c=t.getRenderTarget();for(let f=0;f<6;f++)t.setRenderTarget(this,f),t.clear(n,s,l);t.setRenderTarget(c)}}class qo extends Un{constructor(){super(),this.isGroup=!0,this.type="Group"}}const OM={type:"move"};class jh{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new qo,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new qo,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new Y,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new Y),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new qo,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new Y,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new Y),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const n=this._hand;if(n)for(const s of t.hand.values())this._getHandJoint(n,s)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,n,s){let l=null,c=null,f=null;const d=this._targetRay,m=this._grip,p=this._hand;if(t&&n.session.visibilityState!=="visible-blurred"){if(p&&t.hand){f=!0;for(const A of t.hand.values()){const M=n.getJointPose(A,s),y=this._getHandJoint(p,A);M!==null&&(y.matrix.fromArray(M.transform.matrix),y.matrix.decompose(y.position,y.rotation,y.scale),y.matrixWorldNeedsUpdate=!0,y.jointRadius=M.radius),y.visible=M!==null}const x=p.joints["index-finger-tip"],g=p.joints["thumb-tip"],_=x.position.distanceTo(g.position),S=.02,b=.005;p.inputState.pinching&&_>S+b?(p.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!p.inputState.pinching&&_<=S-b&&(p.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else m!==null&&t.gripSpace&&(c=n.getPose(t.gripSpace,s),c!==null&&(m.matrix.fromArray(c.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,c.linearVelocity?(m.hasLinearVelocity=!0,m.linearVelocity.copy(c.linearVelocity)):m.hasLinearVelocity=!1,c.angularVelocity?(m.hasAngularVelocity=!0,m.angularVelocity.copy(c.angularVelocity)):m.hasAngularVelocity=!1));d!==null&&(l=n.getPose(t.targetRaySpace,s),l===null&&c!==null&&(l=c),l!==null&&(d.matrix.fromArray(l.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,l.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(l.linearVelocity)):d.hasLinearVelocity=!1,l.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(l.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(OM)))}return d!==null&&(d.visible=l!==null),m!==null&&(m.visible=c!==null),p!==null&&(p.visible=f!==null),this}_getHandJoint(t,n){if(t.joints[n.jointName]===void 0){const s=new qo;s.matrixAutoUpdate=!1,s.visible=!1,t.joints[n.jointName]=s,t.add(s)}return t.joints[n.jointName]}}class PM extends Un{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ii,this.environmentIntensity=1,this.environmentRotation=new Ii,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,n){return super.copy(t,n),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const n=super.toJSON(t);return this.fog!==null&&(n.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(n.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(n.object.backgroundIntensity=this.backgroundIntensity),n.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(n.object.environmentIntensity=this.environmentIntensity),n.object.environmentRotation=this.environmentRotation.toArray(),n}}class zM extends In{constructor(t=null,n=1,s=1,l,c,f,d,m,p=oi,x=oi,g,_){super(null,f,d,m,p,x,l,c,g,_),this.isDataTexture=!0,this.image={data:t,width:n,height:s},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Zh=new Y,BM=new Y,FM=new _e;class Ja{constructor(t=new Y(1,0,0),n=0){this.isPlane=!0,this.normal=t,this.constant=n}set(t,n){return this.normal.copy(t),this.constant=n,this}setComponents(t,n,s,l){return this.normal.set(t,n,s),this.constant=l,this}setFromNormalAndCoplanarPoint(t,n){return this.normal.copy(t),this.constant=-n.dot(this.normal),this}setFromCoplanarPoints(t,n,s){const l=Zh.subVectors(s,n).cross(BM.subVectors(t,n)).normalize();return this.setFromNormalAndCoplanarPoint(l,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,n){return n.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,n){const s=t.delta(Zh),l=this.normal.dot(s);if(l===0)return this.distanceToPoint(t.start)===0?n.copy(t.start):null;const c=-(t.start.dot(this.normal)+this.constant)/l;return c<0||c>1?null:n.copy(t.start).addScaledVector(s,c)}intersectsLine(t){const n=this.distanceToPoint(t.start),s=this.distanceToPoint(t.end);return n<0&&s>0||s<0&&n>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,n){const s=n||FM.getNormalMatrix(t),l=this.coplanarPoint(Zh).applyMatrix4(t),c=this.normal.applyMatrix3(s).normalize();return this.constant=-l.dot(c),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ts=new ou,IM=new Nt(.5,.5),Pc=new Y;class hp{constructor(t=new Ja,n=new Ja,s=new Ja,l=new Ja,c=new Ja,f=new Ja){this.planes=[t,n,s,l,c,f]}set(t,n,s,l,c,f){const d=this.planes;return d[0].copy(t),d[1].copy(n),d[2].copy(s),d[3].copy(l),d[4].copy(c),d[5].copy(f),this}copy(t){const n=this.planes;for(let s=0;s<6;s++)n[s].copy(t.planes[s]);return this}setFromProjectionMatrix(t,n=zi,s=!1){const l=this.planes,c=t.elements,f=c[0],d=c[1],m=c[2],p=c[3],x=c[4],g=c[5],_=c[6],S=c[7],b=c[8],A=c[9],M=c[10],y=c[11],z=c[12],w=c[13],O=c[14],k=c[15];if(l[0].setComponents(p-f,S-x,y-b,k-z).normalize(),l[1].setComponents(p+f,S+x,y+b,k+z).normalize(),l[2].setComponents(p+d,S+g,y+A,k+w).normalize(),l[3].setComponents(p-d,S-g,y-A,k-w).normalize(),s)l[4].setComponents(m,_,M,O).normalize(),l[5].setComponents(p-m,S-_,y-M,k-O).normalize();else if(l[4].setComponents(p-m,S-_,y-M,k-O).normalize(),n===zi)l[5].setComponents(p+m,S+_,y+M,k+O).normalize();else if(n===eu)l[5].setComponents(m,_,M,O).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+n);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Ts.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const n=t.geometry;n.boundingSphere===null&&n.computeBoundingSphere(),Ts.copy(n.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Ts)}intersectsSprite(t){Ts.center.set(0,0,0);const n=IM.distanceTo(t.center);return Ts.radius=.7071067811865476+n,Ts.applyMatrix4(t.matrixWorld),this.intersectsSphere(Ts)}intersectsSphere(t){const n=this.planes,s=t.center,l=-t.radius;for(let c=0;c<6;c++)if(n[c].distanceToPoint(s)<l)return!1;return!0}intersectsBox(t){const n=this.planes;for(let s=0;s<6;s++){const l=n[s];if(Pc.x=l.normal.x>0?t.max.x:t.min.x,Pc.y=l.normal.y>0?t.max.y:t.min.y,Pc.z=l.normal.z>0?t.max.z:t.min.z,l.distanceToPoint(Pc)<0)return!1}return!0}containsPoint(t){const n=this.planes;for(let s=0;s<6;s++)if(n[s].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class lu extends Gr{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Te(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const iu=new Y,au=new Y,Lg=new tn,Xo=new fp,zc=new ou,Kh=new Y,Ng=new Y;class HM extends Un{constructor(t=new Zn,n=new lu){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const n=t.attributes.position,s=[0];for(let l=1,c=n.count;l<c;l++)iu.fromBufferAttribute(n,l-1),au.fromBufferAttribute(n,l),s[l]=s[l-1],s[l]+=iu.distanceTo(au);t.setAttribute("lineDistance",new Tn(s,1))}else fe("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,n){const s=this.geometry,l=this.matrixWorld,c=t.params.Line.threshold,f=s.drawRange;if(s.boundingSphere===null&&s.computeBoundingSphere(),zc.copy(s.boundingSphere),zc.applyMatrix4(l),zc.radius+=c,t.ray.intersectsSphere(zc)===!1)return;Lg.copy(l).invert(),Xo.copy(t.ray).applyMatrix4(Lg);const d=c/((this.scale.x+this.scale.y+this.scale.z)/3),m=d*d,p=this.isLineSegments?2:1,x=s.index,_=s.attributes.position;if(x!==null){const S=Math.max(0,f.start),b=Math.min(x.count,f.start+f.count);for(let A=S,M=b-1;A<M;A+=p){const y=x.getX(A),z=x.getX(A+1),w=Bc(this,t,Xo,m,y,z,A);w&&n.push(w)}if(this.isLineLoop){const A=x.getX(b-1),M=x.getX(S),y=Bc(this,t,Xo,m,A,M,b-1);y&&n.push(y)}}else{const S=Math.max(0,f.start),b=Math.min(_.count,f.start+f.count);for(let A=S,M=b-1;A<M;A+=p){const y=Bc(this,t,Xo,m,A,A+1,A);y&&n.push(y)}if(this.isLineLoop){const A=Bc(this,t,Xo,m,b-1,S,b-1);A&&n.push(A)}}}updateMorphTargets(){const n=this.geometry.morphAttributes,s=Object.keys(n);if(s.length>0){const l=n[s[0]];if(l!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let c=0,f=l.length;c<f;c++){const d=l[c].name||String(c);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=c}}}}}function Bc(r,t,n,s,l,c,f){const d=r.geometry.attributes.position;if(iu.fromBufferAttribute(d,l),au.fromBufferAttribute(d,c),n.distanceSqToSegment(iu,au,Kh,Ng)>s)return;Kh.applyMatrix4(r.matrixWorld);const p=t.ray.origin.distanceTo(Kh);if(!(p<t.near||p>t.far))return{distance:p,point:Ng.clone().applyMatrix4(r.matrixWorld),index:f,face:null,faceIndex:null,barycoord:null,object:r}}const Og=new Y,Pg=new Y;class cu extends HM{constructor(t,n){super(t,n),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const n=t.attributes.position,s=[];for(let l=0,c=n.count;l<c;l+=2)Og.fromBufferAttribute(n,l),Pg.fromBufferAttribute(n,l+1),s[l]=l===0?0:s[l-1],s[l+1]=s[l]+Og.distanceTo(Pg);t.setAttribute("lineDistance",new Tn(s,1))}else fe("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class H_ extends In{constructor(t,n,s=Ls,l,c,f,d=oi,m=oi,p,x=tl,g=1){if(x!==tl&&x!==el)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const _={width:t,height:n,depth:g};super(_,l,c,f,d,m,x,s,p),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new up(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const n=super.toJSON(t);return this.compareFunction!==null&&(n.compareFunction=this.compareFunction),n}}class G_ extends In{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}const Fc=new Y,Ic=new Y,Qh=new Y,Hc=new vi;class GM extends Zn{constructor(t=null,n=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:n},t!==null){const l=Math.pow(10,4),c=Math.cos(Zo*n),f=t.getIndex(),d=t.getAttribute("position"),m=f?f.count:d.count,p=[0,0,0],x=["a","b","c"],g=new Array(3),_={},S=[];for(let b=0;b<m;b+=3){f?(p[0]=f.getX(b),p[1]=f.getX(b+1),p[2]=f.getX(b+2)):(p[0]=b,p[1]=b+1,p[2]=b+2);const{a:A,b:M,c:y}=Hc;if(A.fromBufferAttribute(d,p[0]),M.fromBufferAttribute(d,p[1]),y.fromBufferAttribute(d,p[2]),Hc.getNormal(Qh),g[0]=`${Math.round(A.x*l)},${Math.round(A.y*l)},${Math.round(A.z*l)}`,g[1]=`${Math.round(M.x*l)},${Math.round(M.y*l)},${Math.round(M.z*l)}`,g[2]=`${Math.round(y.x*l)},${Math.round(y.y*l)},${Math.round(y.z*l)}`,!(g[0]===g[1]||g[1]===g[2]||g[2]===g[0]))for(let z=0;z<3;z++){const w=(z+1)%3,O=g[z],k=g[w],P=Hc[x[z]],F=Hc[x[w]],Q=`${O}_${k}`,D=`${k}_${O}`;D in _&&_[D]?(Qh.dot(_[D].normal)<=c&&(S.push(P.x,P.y,P.z),S.push(F.x,F.y,F.z)),_[D]=null):Q in _||(_[Q]={index0:p[z],index1:p[w],normal:Qh.clone()})}}for(const b in _)if(_[b]){const{index0:A,index1:M}=_[b];Fc.fromBufferAttribute(d,A),Ic.fromBufferAttribute(d,M),S.push(Fc.x,Fc.y,Fc.z),S.push(Ic.x,Ic.y,Ic.z)}this.setAttribute("position",new Tn(S,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}}class Gi{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){fe("Curve: .getPoint() not implemented.")}getPointAt(t,n){const s=this.getUtoTmapping(t);return this.getPoint(s,n)}getPoints(t=5){const n=[];for(let s=0;s<=t;s++)n.push(this.getPoint(s/t));return n}getSpacedPoints(t=5){const n=[];for(let s=0;s<=t;s++)n.push(this.getPointAt(s/t));return n}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const n=[];let s,l=this.getPoint(0),c=0;n.push(0);for(let f=1;f<=t;f++)s=this.getPoint(f/t),c+=s.distanceTo(l),n.push(c),l=s;return this.cacheArcLengths=n,n}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,n=null){const s=this.getLengths();let l=0;const c=s.length;let f;n?f=n:f=t*s[c-1];let d=0,m=c-1,p;for(;d<=m;)if(l=Math.floor(d+(m-d)/2),p=s[l]-f,p<0)d=l+1;else if(p>0)m=l-1;else{m=l;break}if(l=m,s[l]===f)return l/(c-1);const x=s[l],_=s[l+1]-x,S=(f-x)/_;return(l+S)/(c-1)}getTangent(t,n){let l=t-1e-4,c=t+1e-4;l<0&&(l=0),c>1&&(c=1);const f=this.getPoint(l),d=this.getPoint(c),m=n||(f.isVector2?new Nt:new Y);return m.copy(d).sub(f).normalize(),m}getTangentAt(t,n){const s=this.getUtoTmapping(t);return this.getTangent(s,n)}computeFrenetFrames(t,n=!1){const s=new Y,l=[],c=[],f=[],d=new Y,m=new tn;for(let S=0;S<=t;S++){const b=S/t;l[S]=this.getTangentAt(b,new Y)}c[0]=new Y,f[0]=new Y;let p=Number.MAX_VALUE;const x=Math.abs(l[0].x),g=Math.abs(l[0].y),_=Math.abs(l[0].z);x<=p&&(p=x,s.set(1,0,0)),g<=p&&(p=g,s.set(0,1,0)),_<=p&&s.set(0,0,1),d.crossVectors(l[0],s).normalize(),c[0].crossVectors(l[0],d),f[0].crossVectors(l[0],c[0]);for(let S=1;S<=t;S++){if(c[S]=c[S-1].clone(),f[S]=f[S-1].clone(),d.crossVectors(l[S-1],l[S]),d.length()>Number.EPSILON){d.normalize();const b=Math.acos(ye(l[S-1].dot(l[S]),-1,1));c[S].applyMatrix4(m.makeRotationAxis(d,b))}f[S].crossVectors(l[S],c[S])}if(n===!0){let S=Math.acos(ye(c[0].dot(c[t]),-1,1));S/=t,l[0].dot(d.crossVectors(c[0],c[t]))>0&&(S=-S);for(let b=1;b<=t;b++)c[b].applyMatrix4(m.makeRotationAxis(l[b],S*b)),f[b].crossVectors(l[b],c[b])}return{tangents:l,normals:c,binormals:f}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class dp extends Gi{constructor(t=0,n=0,s=1,l=1,c=0,f=Math.PI*2,d=!1,m=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=n,this.xRadius=s,this.yRadius=l,this.aStartAngle=c,this.aEndAngle=f,this.aClockwise=d,this.aRotation=m}getPoint(t,n=new Nt){const s=n,l=Math.PI*2;let c=this.aEndAngle-this.aStartAngle;const f=Math.abs(c)<Number.EPSILON;for(;c<0;)c+=l;for(;c>l;)c-=l;c<Number.EPSILON&&(f?c=0:c=l),this.aClockwise===!0&&!f&&(c===l?c=-l:c=c-l);const d=this.aStartAngle+t*c;let m=this.aX+this.xRadius*Math.cos(d),p=this.aY+this.yRadius*Math.sin(d);if(this.aRotation!==0){const x=Math.cos(this.aRotation),g=Math.sin(this.aRotation),_=m-this.aX,S=p-this.aY;m=_*x-S*g+this.aX,p=_*g+S*x+this.aY}return s.set(m,p)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class VM extends dp{constructor(t,n,s,l,c,f){super(t,n,s,s,l,c,f),this.isArcCurve=!0,this.type="ArcCurve"}}function pp(){let r=0,t=0,n=0,s=0;function l(c,f,d,m){r=c,t=d,n=-3*c+3*f-2*d-m,s=2*c-2*f+d+m}return{initCatmullRom:function(c,f,d,m,p){l(f,d,p*(d-c),p*(m-f))},initNonuniformCatmullRom:function(c,f,d,m,p,x,g){let _=(f-c)/p-(d-c)/(p+x)+(d-f)/x,S=(d-f)/x-(m-f)/(x+g)+(m-d)/g;_*=x,S*=x,l(f,d,_,S)},calc:function(c){const f=c*c,d=f*c;return r+t*c+n*f+s*d}}}const Gc=new Y,Jh=new pp,$h=new pp,td=new pp;class kM extends Gi{constructor(t=[],n=!1,s="centripetal",l=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=n,this.curveType=s,this.tension=l}getPoint(t,n=new Y){const s=n,l=this.points,c=l.length,f=(c-(this.closed?0:1))*t;let d=Math.floor(f),m=f-d;this.closed?d+=d>0?0:(Math.floor(Math.abs(d)/c)+1)*c:m===0&&d===c-1&&(d=c-2,m=1);let p,x;this.closed||d>0?p=l[(d-1)%c]:(Gc.subVectors(l[0],l[1]).add(l[0]),p=Gc);const g=l[d%c],_=l[(d+1)%c];if(this.closed||d+2<c?x=l[(d+2)%c]:(Gc.subVectors(l[c-1],l[c-2]).add(l[c-1]),x=Gc),this.curveType==="centripetal"||this.curveType==="chordal"){const S=this.curveType==="chordal"?.5:.25;let b=Math.pow(p.distanceToSquared(g),S),A=Math.pow(g.distanceToSquared(_),S),M=Math.pow(_.distanceToSquared(x),S);A<1e-4&&(A=1),b<1e-4&&(b=A),M<1e-4&&(M=A),Jh.initNonuniformCatmullRom(p.x,g.x,_.x,x.x,b,A,M),$h.initNonuniformCatmullRom(p.y,g.y,_.y,x.y,b,A,M),td.initNonuniformCatmullRom(p.z,g.z,_.z,x.z,b,A,M)}else this.curveType==="catmullrom"&&(Jh.initCatmullRom(p.x,g.x,_.x,x.x,this.tension),$h.initCatmullRom(p.y,g.y,_.y,x.y,this.tension),td.initCatmullRom(p.z,g.z,_.z,x.z,this.tension));return s.set(Jh.calc(m),$h.calc(m),td.calc(m)),s}copy(t){super.copy(t),this.points=[];for(let n=0,s=t.points.length;n<s;n++){const l=t.points[n];this.points.push(l.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let n=0,s=this.points.length;n<s;n++){const l=this.points[n];t.points.push(l.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let n=0,s=t.points.length;n<s;n++){const l=t.points[n];this.points.push(new Y().fromArray(l))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function zg(r,t,n,s,l){const c=(s-t)*.5,f=(l-n)*.5,d=r*r,m=r*d;return(2*n-2*s+c+f)*m+(-3*n+3*s-2*c-f)*d+c*r+n}function XM(r,t){const n=1-r;return n*n*t}function WM(r,t){return 2*(1-r)*r*t}function qM(r,t){return r*r*t}function Ko(r,t,n,s){return XM(r,t)+WM(r,n)+qM(r,s)}function YM(r,t){const n=1-r;return n*n*n*t}function jM(r,t){const n=1-r;return 3*n*n*r*t}function ZM(r,t){return 3*(1-r)*r*r*t}function KM(r,t){return r*r*r*t}function Qo(r,t,n,s,l){return YM(r,t)+jM(r,n)+ZM(r,s)+KM(r,l)}class V_ extends Gi{constructor(t=new Nt,n=new Nt,s=new Nt,l=new Nt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=n,this.v2=s,this.v3=l}getPoint(t,n=new Nt){const s=n,l=this.v0,c=this.v1,f=this.v2,d=this.v3;return s.set(Qo(t,l.x,c.x,f.x,d.x),Qo(t,l.y,c.y,f.y,d.y)),s}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class QM extends Gi{constructor(t=new Y,n=new Y,s=new Y,l=new Y){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=n,this.v2=s,this.v3=l}getPoint(t,n=new Y){const s=n,l=this.v0,c=this.v1,f=this.v2,d=this.v3;return s.set(Qo(t,l.x,c.x,f.x,d.x),Qo(t,l.y,c.y,f.y,d.y),Qo(t,l.z,c.z,f.z,d.z)),s}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class k_ extends Gi{constructor(t=new Nt,n=new Nt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=n}getPoint(t,n=new Nt){const s=n;return t===1?s.copy(this.v2):(s.copy(this.v2).sub(this.v1),s.multiplyScalar(t).add(this.v1)),s}getPointAt(t,n){return this.getPoint(t,n)}getTangent(t,n=new Nt){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,n){return this.getTangent(t,n)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class JM extends Gi{constructor(t=new Y,n=new Y){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=n}getPoint(t,n=new Y){const s=n;return t===1?s.copy(this.v2):(s.copy(this.v2).sub(this.v1),s.multiplyScalar(t).add(this.v1)),s}getPointAt(t,n){return this.getPoint(t,n)}getTangent(t,n=new Y){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,n){return this.getTangent(t,n)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class X_ extends Gi{constructor(t=new Nt,n=new Nt,s=new Nt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=n,this.v2=s}getPoint(t,n=new Nt){const s=n,l=this.v0,c=this.v1,f=this.v2;return s.set(Ko(t,l.x,c.x,f.x),Ko(t,l.y,c.y,f.y)),s}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class $M extends Gi{constructor(t=new Y,n=new Y,s=new Y){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=n,this.v2=s}getPoint(t,n=new Y){const s=n,l=this.v0,c=this.v1,f=this.v2;return s.set(Ko(t,l.x,c.x,f.x),Ko(t,l.y,c.y,f.y),Ko(t,l.z,c.z,f.z)),s}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class W_ extends Gi{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,n=new Nt){const s=n,l=this.points,c=(l.length-1)*t,f=Math.floor(c),d=c-f,m=l[f===0?f:f-1],p=l[f],x=l[f>l.length-2?l.length-1:f+1],g=l[f>l.length-3?l.length-1:f+2];return s.set(zg(d,m.x,p.x,x.x,g.x),zg(d,m.y,p.y,x.y,g.y)),s}copy(t){super.copy(t),this.points=[];for(let n=0,s=t.points.length;n<s;n++){const l=t.points[n];this.points.push(l.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let n=0,s=this.points.length;n<s;n++){const l=this.points[n];t.points.push(l.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let n=0,s=t.points.length;n<s;n++){const l=t.points[n];this.points.push(new Nt().fromArray(l))}return this}}var Kd=Object.freeze({__proto__:null,ArcCurve:VM,CatmullRomCurve3:kM,CubicBezierCurve:V_,CubicBezierCurve3:QM,EllipseCurve:dp,LineCurve:k_,LineCurve3:JM,QuadraticBezierCurve:X_,QuadraticBezierCurve3:$M,SplineCurve:W_});class tb extends Gi{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),n=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(n)){const s=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Kd[s](n,t))}return this}getPoint(t,n){const s=t*this.getLength(),l=this.getCurveLengths();let c=0;for(;c<l.length;){if(l[c]>=s){const f=l[c]-s,d=this.curves[c],m=d.getLength(),p=m===0?0:1-f/m;return d.getPointAt(p,n)}c++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let n=0;for(let s=0,l=this.curves.length;s<l;s++)n+=this.curves[s].getLength(),t.push(n);return this.cacheLengths=t,t}getSpacedPoints(t=40){const n=[];for(let s=0;s<=t;s++)n.push(this.getPoint(s/t));return this.autoClose&&n.push(n[0]),n}getPoints(t=12){const n=[];let s;for(let l=0,c=this.curves;l<c.length;l++){const f=c[l],d=f.isEllipseCurve?t*2:f.isLineCurve||f.isLineCurve3?1:f.isSplineCurve?t*f.points.length:t,m=f.getPoints(d);for(let p=0;p<m.length;p++){const x=m[p];s&&s.equals(x)||(n.push(x),s=x)}}return this.autoClose&&n.length>1&&!n[n.length-1].equals(n[0])&&n.push(n[0]),n}copy(t){super.copy(t),this.curves=[];for(let n=0,s=t.curves.length;n<s;n++){const l=t.curves[n];this.curves.push(l.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let n=0,s=this.curves.length;n<s;n++){const l=this.curves[n];t.curves.push(l.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let n=0,s=t.curves.length;n<s;n++){const l=t.curves[n];this.curves.push(new Kd[l.type]().fromJSON(l))}return this}}class Bg extends tb{constructor(t){super(),this.type="Path",this.currentPoint=new Nt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let n=1,s=t.length;n<s;n++)this.lineTo(t[n].x,t[n].y);return this}moveTo(t,n){return this.currentPoint.set(t,n),this}lineTo(t,n){const s=new k_(this.currentPoint.clone(),new Nt(t,n));return this.curves.push(s),this.currentPoint.set(t,n),this}quadraticCurveTo(t,n,s,l){const c=new X_(this.currentPoint.clone(),new Nt(t,n),new Nt(s,l));return this.curves.push(c),this.currentPoint.set(s,l),this}bezierCurveTo(t,n,s,l,c,f){const d=new V_(this.currentPoint.clone(),new Nt(t,n),new Nt(s,l),new Nt(c,f));return this.curves.push(d),this.currentPoint.set(c,f),this}splineThru(t){const n=[this.currentPoint.clone()].concat(t),s=new W_(n);return this.curves.push(s),this.currentPoint.copy(t[t.length-1]),this}arc(t,n,s,l,c,f){const d=this.currentPoint.x,m=this.currentPoint.y;return this.absarc(t+d,n+m,s,l,c,f),this}absarc(t,n,s,l,c,f){return this.absellipse(t,n,s,s,l,c,f),this}ellipse(t,n,s,l,c,f,d,m){const p=this.currentPoint.x,x=this.currentPoint.y;return this.absellipse(t+p,n+x,s,l,c,f,d,m),this}absellipse(t,n,s,l,c,f,d,m){const p=new dp(t,n,s,l,c,f,d,m);if(this.curves.length>0){const g=p.getPoint(0);g.equals(this.currentPoint)||this.lineTo(g.x,g.y)}this.curves.push(p);const x=p.getPoint(1);return this.currentPoint.copy(x),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class q_ extends Bg{constructor(t){super(t),this.uuid=Hr(),this.type="Shape",this.holes=[]}getPointsHoles(t){const n=[];for(let s=0,l=this.holes.length;s<l;s++)n[s]=this.holes[s].getPoints(t);return n}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let n=0,s=t.holes.length;n<s;n++){const l=t.holes[n];this.holes.push(l.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let n=0,s=this.holes.length;n<s;n++){const l=this.holes[n];t.holes.push(l.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let n=0,s=t.holes.length;n<s;n++){const l=t.holes[n];this.holes.push(new Bg().fromJSON(l))}return this}}function eb(r,t,n=2){const s=t&&t.length,l=s?t[0]*n:r.length;let c=Y_(r,0,l,n,!0);const f=[];if(!c||c.next===c.prev)return f;let d,m,p;if(s&&(c=rb(r,t,c,n)),r.length>80*n){d=r[0],m=r[1];let x=d,g=m;for(let _=n;_<l;_+=n){const S=r[_],b=r[_+1];S<d&&(d=S),b<m&&(m=b),S>x&&(x=S),b>g&&(g=b)}p=Math.max(x-d,g-m),p=p!==0?32767/p:0}return il(c,f,n,d,m,p,0),f}function Y_(r,t,n,s,l){let c;if(l===gb(r,t,n,s)>0)for(let f=t;f<n;f+=s)c=Fg(f/s|0,r[f],r[f+1],c);else for(let f=n-s;f>=t;f-=s)c=Fg(f/s|0,r[f],r[f+1],c);return c&&Fr(c,c.next)&&(sl(c),c=c.next),c}function Os(r,t){if(!r)return r;t||(t=r);let n=r,s;do if(s=!1,!n.steiner&&(Fr(n,n.next)||$e(n.prev,n,n.next)===0)){if(sl(n),n=t=n.prev,n===n.next)break;s=!0}else n=n.next;while(s||n!==t);return t}function il(r,t,n,s,l,c,f){if(!r)return;!f&&c&&fb(r,s,l,c);let d=r;for(;r.prev!==r.next;){const m=r.prev,p=r.next;if(c?ib(r,s,l,c):nb(r)){t.push(m.i,r.i,p.i),sl(r),r=p.next,d=p.next;continue}if(r=p,r===d){f?f===1?(r=ab(Os(r),t),il(r,t,n,s,l,c,2)):f===2&&sb(r,t,n,s,l,c):il(Os(r),t,n,s,l,c,1);break}}}function nb(r){const t=r.prev,n=r,s=r.next;if($e(t,n,s)>=0)return!1;const l=t.x,c=n.x,f=s.x,d=t.y,m=n.y,p=s.y,x=Math.min(l,c,f),g=Math.min(d,m,p),_=Math.max(l,c,f),S=Math.max(d,m,p);let b=s.next;for(;b!==t;){if(b.x>=x&&b.x<=_&&b.y>=g&&b.y<=S&&Yo(l,d,c,m,f,p,b.x,b.y)&&$e(b.prev,b,b.next)>=0)return!1;b=b.next}return!0}function ib(r,t,n,s){const l=r.prev,c=r,f=r.next;if($e(l,c,f)>=0)return!1;const d=l.x,m=c.x,p=f.x,x=l.y,g=c.y,_=f.y,S=Math.min(d,m,p),b=Math.min(x,g,_),A=Math.max(d,m,p),M=Math.max(x,g,_),y=Qd(S,b,t,n,s),z=Qd(A,M,t,n,s);let w=r.prevZ,O=r.nextZ;for(;w&&w.z>=y&&O&&O.z<=z;){if(w.x>=S&&w.x<=A&&w.y>=b&&w.y<=M&&w!==l&&w!==f&&Yo(d,x,m,g,p,_,w.x,w.y)&&$e(w.prev,w,w.next)>=0||(w=w.prevZ,O.x>=S&&O.x<=A&&O.y>=b&&O.y<=M&&O!==l&&O!==f&&Yo(d,x,m,g,p,_,O.x,O.y)&&$e(O.prev,O,O.next)>=0))return!1;O=O.nextZ}for(;w&&w.z>=y;){if(w.x>=S&&w.x<=A&&w.y>=b&&w.y<=M&&w!==l&&w!==f&&Yo(d,x,m,g,p,_,w.x,w.y)&&$e(w.prev,w,w.next)>=0)return!1;w=w.prevZ}for(;O&&O.z<=z;){if(O.x>=S&&O.x<=A&&O.y>=b&&O.y<=M&&O!==l&&O!==f&&Yo(d,x,m,g,p,_,O.x,O.y)&&$e(O.prev,O,O.next)>=0)return!1;O=O.nextZ}return!0}function ab(r,t){let n=r;do{const s=n.prev,l=n.next.next;!Fr(s,l)&&Z_(s,n,n.next,l)&&al(s,l)&&al(l,s)&&(t.push(s.i,n.i,l.i),sl(n),sl(n.next),n=r=l),n=n.next}while(n!==r);return Os(n)}function sb(r,t,n,s,l,c){let f=r;do{let d=f.next.next;for(;d!==f.prev;){if(f.i!==d.i&&pb(f,d)){let m=K_(f,d);f=Os(f,f.next),m=Os(m,m.next),il(f,t,n,s,l,c,0),il(m,t,n,s,l,c,0);return}d=d.next}f=f.next}while(f!==r)}function rb(r,t,n,s){const l=[];for(let c=0,f=t.length;c<f;c++){const d=t[c]*s,m=c<f-1?t[c+1]*s:r.length,p=Y_(r,d,m,s,!1);p===p.next&&(p.steiner=!0),l.push(db(p))}l.sort(ob);for(let c=0;c<l.length;c++)n=lb(l[c],n);return n}function ob(r,t){let n=r.x-t.x;if(n===0&&(n=r.y-t.y,n===0)){const s=(r.next.y-r.y)/(r.next.x-r.x),l=(t.next.y-t.y)/(t.next.x-t.x);n=s-l}return n}function lb(r,t){const n=cb(r,t);if(!n)return t;const s=K_(n,r);return Os(s,s.next),Os(n,n.next)}function cb(r,t){let n=t;const s=r.x,l=r.y;let c=-1/0,f;if(Fr(r,n))return n;do{if(Fr(r,n.next))return n.next;if(l<=n.y&&l>=n.next.y&&n.next.y!==n.y){const g=n.x+(l-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(g<=s&&g>c&&(c=g,f=n.x<n.next.x?n:n.next,g===s))return f}n=n.next}while(n!==t);if(!f)return null;const d=f,m=f.x,p=f.y;let x=1/0;n=f;do{if(s>=n.x&&n.x>=m&&s!==n.x&&j_(l<p?s:c,l,m,p,l<p?c:s,l,n.x,n.y)){const g=Math.abs(l-n.y)/(s-n.x);al(n,r)&&(g<x||g===x&&(n.x>f.x||n.x===f.x&&ub(f,n)))&&(f=n,x=g)}n=n.next}while(n!==d);return f}function ub(r,t){return $e(r.prev,r,t.prev)<0&&$e(t.next,r,r.next)<0}function fb(r,t,n,s){let l=r;do l.z===0&&(l.z=Qd(l.x,l.y,t,n,s)),l.prevZ=l.prev,l.nextZ=l.next,l=l.next;while(l!==r);l.prevZ.nextZ=null,l.prevZ=null,hb(l)}function hb(r){let t,n=1;do{let s=r,l;r=null;let c=null;for(t=0;s;){t++;let f=s,d=0;for(let p=0;p<n&&(d++,f=f.nextZ,!!f);p++);let m=n;for(;d>0||m>0&&f;)d!==0&&(m===0||!f||s.z<=f.z)?(l=s,s=s.nextZ,d--):(l=f,f=f.nextZ,m--),c?c.nextZ=l:r=l,l.prevZ=c,c=l;s=f}c.nextZ=null,n*=2}while(t>1);return r}function Qd(r,t,n,s,l){return r=(r-n)*l|0,t=(t-s)*l|0,r=(r|r<<8)&16711935,r=(r|r<<4)&252645135,r=(r|r<<2)&858993459,r=(r|r<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,r|t<<1}function db(r){let t=r,n=r;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==r);return n}function j_(r,t,n,s,l,c,f,d){return(l-f)*(t-d)>=(r-f)*(c-d)&&(r-f)*(s-d)>=(n-f)*(t-d)&&(n-f)*(c-d)>=(l-f)*(s-d)}function Yo(r,t,n,s,l,c,f,d){return!(r===f&&t===d)&&j_(r,t,n,s,l,c,f,d)}function pb(r,t){return r.next.i!==t.i&&r.prev.i!==t.i&&!mb(r,t)&&(al(r,t)&&al(t,r)&&xb(r,t)&&($e(r.prev,r,t.prev)||$e(r,t.prev,t))||Fr(r,t)&&$e(r.prev,r,r.next)>0&&$e(t.prev,t,t.next)>0)}function $e(r,t,n){return(t.y-r.y)*(n.x-t.x)-(t.x-r.x)*(n.y-t.y)}function Fr(r,t){return r.x===t.x&&r.y===t.y}function Z_(r,t,n,s){const l=kc($e(r,t,n)),c=kc($e(r,t,s)),f=kc($e(n,s,r)),d=kc($e(n,s,t));return!!(l!==c&&f!==d||l===0&&Vc(r,n,t)||c===0&&Vc(r,s,t)||f===0&&Vc(n,r,s)||d===0&&Vc(n,t,s))}function Vc(r,t,n){return t.x<=Math.max(r.x,n.x)&&t.x>=Math.min(r.x,n.x)&&t.y<=Math.max(r.y,n.y)&&t.y>=Math.min(r.y,n.y)}function kc(r){return r>0?1:r<0?-1:0}function mb(r,t){let n=r;do{if(n.i!==r.i&&n.next.i!==r.i&&n.i!==t.i&&n.next.i!==t.i&&Z_(n,n.next,r,t))return!0;n=n.next}while(n!==r);return!1}function al(r,t){return $e(r.prev,r,r.next)<0?$e(r,t,r.next)>=0&&$e(r,r.prev,t)>=0:$e(r,t,r.prev)<0||$e(r,r.next,t)<0}function xb(r,t){let n=r,s=!1;const l=(r.x+t.x)/2,c=(r.y+t.y)/2;do n.y>c!=n.next.y>c&&n.next.y!==n.y&&l<(n.next.x-n.x)*(c-n.y)/(n.next.y-n.y)+n.x&&(s=!s),n=n.next;while(n!==r);return s}function K_(r,t){const n=Jd(r.i,r.x,r.y),s=Jd(t.i,t.x,t.y),l=r.next,c=t.prev;return r.next=t,t.prev=r,n.next=l,l.prev=n,s.next=n,n.prev=s,c.next=s,s.prev=c,s}function Fg(r,t,n,s){const l=Jd(r,t,n);return s?(l.next=s.next,l.prev=s,s.next.prev=l,s.next=l):(l.prev=l,l.next=l),l}function sl(r){r.next.prev=r.prev,r.prev.next=r.next,r.prevZ&&(r.prevZ.nextZ=r.nextZ),r.nextZ&&(r.nextZ.prevZ=r.prevZ)}function Jd(r,t,n){return{i:r,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function gb(r,t,n,s){let l=0;for(let c=t,f=n-s;c<n;c+=s)l+=(r[f]-r[c])*(r[c+1]+r[f+1]),f=c;return l}class _b{static triangulate(t,n,s=2){return eb(t,n,s)}}class wr{static area(t){const n=t.length;let s=0;for(let l=n-1,c=0;c<n;l=c++)s+=t[l].x*t[c].y-t[c].x*t[l].y;return s*.5}static isClockWise(t){return wr.area(t)<0}static triangulateShape(t,n){const s=[],l=[],c=[];Ig(t),Hg(s,t);let f=t.length;n.forEach(Ig);for(let m=0;m<n.length;m++)l.push(f),f+=n[m].length,Hg(s,n[m]);const d=_b.triangulate(s,l);for(let m=0;m<d.length;m+=3)c.push(d.slice(m,m+3));return c}}function Ig(r){const t=r.length;t>2&&r[t-1].equals(r[0])&&r.pop()}function Hg(r,t){for(let n=0;n<t.length;n++)r.push(t[n].x),r.push(t[n].y)}class mp extends Zn{constructor(t=new q_([new Nt(.5,.5),new Nt(-.5,.5),new Nt(-.5,-.5),new Nt(.5,-.5)]),n={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:n},t=Array.isArray(t)?t:[t];const s=this,l=[],c=[];for(let d=0,m=t.length;d<m;d++){const p=t[d];f(p)}this.setAttribute("position",new Tn(l,3)),this.setAttribute("uv",new Tn(c,2)),this.computeVertexNormals();function f(d){const m=[],p=n.curveSegments!==void 0?n.curveSegments:12,x=n.steps!==void 0?n.steps:1,g=n.depth!==void 0?n.depth:1;let _=n.bevelEnabled!==void 0?n.bevelEnabled:!0,S=n.bevelThickness!==void 0?n.bevelThickness:.2,b=n.bevelSize!==void 0?n.bevelSize:S-.1,A=n.bevelOffset!==void 0?n.bevelOffset:0,M=n.bevelSegments!==void 0?n.bevelSegments:3;const y=n.extrudePath,z=n.UVGenerator!==void 0?n.UVGenerator:vb;let w,O=!1,k,P,F,Q;y&&(w=y.getSpacedPoints(x),O=!0,_=!1,k=y.computeFrenetFrames(x,!1),P=new Y,F=new Y,Q=new Y),_||(M=0,S=0,b=0,A=0);const D=d.extractPoints(p);let C=D.shape;const H=D.holes;if(!wr.isClockWise(C)){C=C.reverse();for(let yt=0,L=H.length;yt<L;yt++){const bt=H[yt];wr.isClockWise(bt)&&(H[yt]=bt.reverse())}}function ct(yt){const bt=10000000000000001e-36;let Ct=yt[0];for(let Dt=1;Dt<=yt.length;Dt++){const Tt=Dt%yt.length,Wt=yt[Tt],Pt=Wt.x-Ct.x,kt=Wt.y-Ct.y,U=Pt*Pt+kt*kt,E=Math.max(Math.abs(Wt.x),Math.abs(Wt.y),Math.abs(Ct.x),Math.abs(Ct.y)),K=bt*E*E;if(U<=K){yt.splice(Tt,1),Dt--;continue}Ct=Wt}}ct(C),H.forEach(ct);const pt=H.length,lt=C;for(let yt=0;yt<pt;yt++){const L=H[yt];C=C.concat(L)}function B(yt,L,bt){return L||an("ExtrudeGeometry: vec does not exist"),yt.clone().addScaledVector(L,bt)}const q=C.length;function j(yt,L,bt){let Ct,Dt,Tt;const Wt=yt.x-L.x,Pt=yt.y-L.y,kt=bt.x-yt.x,U=bt.y-yt.y,E=Wt*Wt+Pt*Pt,K=Wt*U-Pt*kt;if(Math.abs(K)>Number.EPSILON){const ft=Math.sqrt(E),St=Math.sqrt(kt*kt+U*U),ot=L.x-Pt/ft,$t=L.y+Wt/ft,zt=bt.x-U/St,ee=bt.y+kt/St,Qt=((zt-ot)*U-(ee-$t)*kt)/(Wt*U-Pt*kt);Ct=ot+Wt*Qt-yt.x,Dt=$t+Pt*Qt-yt.y;const Mt=Ct*Ct+Dt*Dt;if(Mt<=2)return new Nt(Ct,Dt);Tt=Math.sqrt(Mt/2)}else{let ft=!1;Wt>Number.EPSILON?kt>Number.EPSILON&&(ft=!0):Wt<-Number.EPSILON?kt<-Number.EPSILON&&(ft=!0):Math.sign(Pt)===Math.sign(U)&&(ft=!0),ft?(Ct=-Pt,Dt=Wt,Tt=Math.sqrt(E)):(Ct=Wt,Dt=Pt,Tt=Math.sqrt(E/2))}return new Nt(Ct/Tt,Dt/Tt)}const xt=[];for(let yt=0,L=lt.length,bt=L-1,Ct=yt+1;yt<L;yt++,bt++,Ct++)bt===L&&(bt=0),Ct===L&&(Ct=0),xt[yt]=j(lt[yt],lt[bt],lt[Ct]);const vt=[];let N,it=xt.concat();for(let yt=0,L=pt;yt<L;yt++){const bt=H[yt];N=[];for(let Ct=0,Dt=bt.length,Tt=Dt-1,Wt=Ct+1;Ct<Dt;Ct++,Tt++,Wt++)Tt===Dt&&(Tt=0),Wt===Dt&&(Wt=0),N[Ct]=j(bt[Ct],bt[Tt],bt[Wt]);vt.push(N),it=it.concat(N)}let _t;if(M===0)_t=wr.triangulateShape(lt,H);else{const yt=[],L=[];for(let bt=0;bt<M;bt++){const Ct=bt/M,Dt=S*Math.cos(Ct*Math.PI/2),Tt=b*Math.sin(Ct*Math.PI/2)+A;for(let Wt=0,Pt=lt.length;Wt<Pt;Wt++){const kt=B(lt[Wt],xt[Wt],Tt);Ht(kt.x,kt.y,-Dt),Ct===0&&yt.push(kt)}for(let Wt=0,Pt=pt;Wt<Pt;Wt++){const kt=H[Wt];N=vt[Wt];const U=[];for(let E=0,K=kt.length;E<K;E++){const ft=B(kt[E],N[E],Tt);Ht(ft.x,ft.y,-Dt),Ct===0&&U.push(ft)}Ct===0&&L.push(U)}}_t=wr.triangulateShape(yt,L)}const Rt=_t.length,Gt=b+A;for(let yt=0;yt<q;yt++){const L=_?B(C[yt],it[yt],Gt):C[yt];O?(F.copy(k.normals[0]).multiplyScalar(L.x),P.copy(k.binormals[0]).multiplyScalar(L.y),Q.copy(w[0]).add(F).add(P),Ht(Q.x,Q.y,Q.z)):Ht(L.x,L.y,0)}for(let yt=1;yt<=x;yt++)for(let L=0;L<q;L++){const bt=_?B(C[L],it[L],Gt):C[L];O?(F.copy(k.normals[yt]).multiplyScalar(bt.x),P.copy(k.binormals[yt]).multiplyScalar(bt.y),Q.copy(w[yt]).add(F).add(P),Ht(Q.x,Q.y,Q.z)):Ht(bt.x,bt.y,g/x*yt)}for(let yt=M-1;yt>=0;yt--){const L=yt/M,bt=S*Math.cos(L*Math.PI/2),Ct=b*Math.sin(L*Math.PI/2)+A;for(let Dt=0,Tt=lt.length;Dt<Tt;Dt++){const Wt=B(lt[Dt],xt[Dt],Ct);Ht(Wt.x,Wt.y,g+bt)}for(let Dt=0,Tt=H.length;Dt<Tt;Dt++){const Wt=H[Dt];N=vt[Dt];for(let Pt=0,kt=Wt.length;Pt<kt;Pt++){const U=B(Wt[Pt],N[Pt],Ct);O?Ht(U.x,U.y+w[x-1].y,w[x-1].x+bt):Ht(U.x,U.y,g+bt)}}}at(),ut();function at(){const yt=l.length/3;if(_){let L=0,bt=q*L;for(let Ct=0;Ct<Rt;Ct++){const Dt=_t[Ct];Zt(Dt[2]+bt,Dt[1]+bt,Dt[0]+bt)}L=x+M*2,bt=q*L;for(let Ct=0;Ct<Rt;Ct++){const Dt=_t[Ct];Zt(Dt[0]+bt,Dt[1]+bt,Dt[2]+bt)}}else{for(let L=0;L<Rt;L++){const bt=_t[L];Zt(bt[2],bt[1],bt[0])}for(let L=0;L<Rt;L++){const bt=_t[L];Zt(bt[0]+q*x,bt[1]+q*x,bt[2]+q*x)}}s.addGroup(yt,l.length/3-yt,0)}function ut(){const yt=l.length/3;let L=0;Ot(lt,L),L+=lt.length;for(let bt=0,Ct=H.length;bt<Ct;bt++){const Dt=H[bt];Ot(Dt,L),L+=Dt.length}s.addGroup(yt,l.length/3-yt,1)}function Ot(yt,L){let bt=yt.length;for(;--bt>=0;){const Ct=bt;let Dt=bt-1;Dt<0&&(Dt=yt.length-1);for(let Tt=0,Wt=x+M*2;Tt<Wt;Tt++){const Pt=q*Tt,kt=q*(Tt+1),U=L+Ct+Pt,E=L+Dt+Pt,K=L+Dt+kt,ft=L+Ct+kt;pe(U,E,K,ft)}}}function Ht(yt,L,bt){m.push(yt),m.push(L),m.push(bt)}function Zt(yt,L,bt){Pe(yt),Pe(L),Pe(bt);const Ct=l.length/3,Dt=z.generateTopUV(s,l,Ct-3,Ct-2,Ct-1);oe(Dt[0]),oe(Dt[1]),oe(Dt[2])}function pe(yt,L,bt,Ct){Pe(yt),Pe(L),Pe(Ct),Pe(L),Pe(bt),Pe(Ct);const Dt=l.length/3,Tt=z.generateSideWallUV(s,l,Dt-6,Dt-3,Dt-2,Dt-1);oe(Tt[0]),oe(Tt[1]),oe(Tt[3]),oe(Tt[1]),oe(Tt[2]),oe(Tt[3])}function Pe(yt){l.push(m[yt*3+0]),l.push(m[yt*3+1]),l.push(m[yt*3+2])}function oe(yt){c.push(yt.x),c.push(yt.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON(),n=this.parameters.shapes,s=this.parameters.options;return yb(n,s,t)}static fromJSON(t,n){const s=[];for(let c=0,f=t.shapes.length;c<f;c++){const d=n[t.shapes[c]];s.push(d)}const l=t.options.extrudePath;return l!==void 0&&(t.options.extrudePath=new Kd[l.type]().fromJSON(l)),new mp(s,t.options)}}const vb={generateTopUV:function(r,t,n,s,l){const c=t[n*3],f=t[n*3+1],d=t[s*3],m=t[s*3+1],p=t[l*3],x=t[l*3+1];return[new Nt(c,f),new Nt(d,m),new Nt(p,x)]},generateSideWallUV:function(r,t,n,s,l,c){const f=t[n*3],d=t[n*3+1],m=t[n*3+2],p=t[s*3],x=t[s*3+1],g=t[s*3+2],_=t[l*3],S=t[l*3+1],b=t[l*3+2],A=t[c*3],M=t[c*3+1],y=t[c*3+2];return Math.abs(d-x)<Math.abs(f-p)?[new Nt(f,1-m),new Nt(p,1-g),new Nt(_,1-b),new Nt(A,1-y)]:[new Nt(d,1-m),new Nt(x,1-g),new Nt(S,1-b),new Nt(M,1-y)]}};function yb(r,t,n){if(n.shapes=[],Array.isArray(r))for(let s=0,l=r.length;s<l;s++){const c=r[s];n.shapes.push(c.uuid)}else n.shapes.push(r.uuid);return n.options=Object.assign({},t),t.extrudePath!==void 0&&(n.options.extrudePath=t.extrudePath.toJSON()),n}class uu extends Zn{constructor(t=1,n=1,s=1,l=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:n,widthSegments:s,heightSegments:l};const c=t/2,f=n/2,d=Math.floor(s),m=Math.floor(l),p=d+1,x=m+1,g=t/d,_=n/m,S=[],b=[],A=[],M=[];for(let y=0;y<x;y++){const z=y*_-f;for(let w=0;w<p;w++){const O=w*g-c;b.push(O,-z,0),A.push(0,0,1),M.push(w/d),M.push(1-y/m)}}for(let y=0;y<m;y++)for(let z=0;z<d;z++){const w=z+p*y,O=z+p*(y+1),k=z+1+p*(y+1),P=z+1+p*y;S.push(w,O,P),S.push(O,k,P)}this.setIndex(S),this.setAttribute("position",new Tn(b,3)),this.setAttribute("normal",new Tn(A,3)),this.setAttribute("uv",new Tn(M,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new uu(t.width,t.height,t.widthSegments,t.heightSegments)}}class Sb extends Gr{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Te(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Te(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=C_,this.normalScale=new Nt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ii,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Mb extends Gr{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=QS,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class bb extends Gr{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Q_ extends Un{constructor(t,n=1){super(),this.isLight=!0,this.type="Light",this.color=new Te(t),this.intensity=n}dispose(){}copy(t,n){return super.copy(t,n),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const n=super.toJSON(t);return n.object.color=this.color.getHex(),n.object.intensity=this.intensity,this.groundColor!==void 0&&(n.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(n.object.distance=this.distance),this.angle!==void 0&&(n.object.angle=this.angle),this.decay!==void 0&&(n.object.decay=this.decay),this.penumbra!==void 0&&(n.object.penumbra=this.penumbra),this.shadow!==void 0&&(n.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(n.object.target=this.target.uuid),n}}const ed=new tn,Gg=new Y,Vg=new Y;class Eb{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Nt(512,512),this.mapType=Fi,this.map=null,this.mapPass=null,this.matrix=new tn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new hp,this._frameExtents=new Nt(1,1),this._viewportCount=1,this._viewports=[new sn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const n=this.camera,s=this.matrix;Gg.setFromMatrixPosition(t.matrixWorld),n.position.copy(Gg),Vg.setFromMatrixPosition(t.target.matrixWorld),n.lookAt(Vg),n.updateMatrixWorld(),ed.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ed,n.coordinateSystem,n.reversedDepth),n.reversedDepth?s.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):s.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),s.multiply(ed)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class J_ extends F_{constructor(t=-1,n=1,s=1,l=-1,c=.1,f=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=n,this.top=s,this.bottom=l,this.near=c,this.far=f,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,n,s,l,c,f){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=s,this.view.offsetY=l,this.view.width=c,this.view.height=f,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),n=(this.top-this.bottom)/(2*this.zoom),s=(this.right+this.left)/2,l=(this.top+this.bottom)/2;let c=s-t,f=s+t,d=l+n,m=l-n;if(this.view!==null&&this.view.enabled){const p=(this.right-this.left)/this.view.fullWidth/this.zoom,x=(this.top-this.bottom)/this.view.fullHeight/this.zoom;c+=p*this.view.offsetX,f=c+p*this.view.width,d-=x*this.view.offsetY,m=d-x*this.view.height}this.projectionMatrix.makeOrthographic(c,f,d,m,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const n=super.toJSON(t);return n.object.zoom=this.zoom,n.object.left=this.left,n.object.right=this.right,n.object.top=this.top,n.object.bottom=this.bottom,n.object.near=this.near,n.object.far=this.far,this.view!==null&&(n.object.view=Object.assign({},this.view)),n}}class Tb extends Eb{constructor(){super(new J_(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class kg extends Q_{constructor(t,n){super(t,n),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Un.DEFAULT_UP),this.updateMatrix(),this.target=new Un,this.shadow=new Tb}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class Ab extends Q_{constructor(t,n){super(t,n),this.isAmbientLight=!0,this.type="AmbientLight"}}class Rb extends _i{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}class Xg{constructor(t=1,n=0,s=0){this.radius=t,this.phi=n,this.theta=s}set(t,n,s){return this.radius=t,this.phi=n,this.theta=s,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=ye(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,n,s){return this.radius=Math.sqrt(t*t+n*n+s*s),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,s),this.phi=Math.acos(ye(n/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class Cb extends cu{constructor(t=10,n=10,s=4473924,l=8947848){s=new Te(s),l=new Te(l);const c=n/2,f=t/n,d=t/2,m=[],p=[];for(let _=0,S=0,b=-d;_<=n;_++,b+=f){m.push(-d,0,b,d,0,b),m.push(b,0,-d,b,0,d);const A=_===c?s:l;A.toArray(p,S),S+=3,A.toArray(p,S),S+=3,A.toArray(p,S),S+=3,A.toArray(p,S),S+=3}const x=new Zn;x.setAttribute("position",new Tn(m,3)),x.setAttribute("color",new Tn(p,3));const g=new lu({vertexColors:!0,toneMapped:!1});super(x,g),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class wb extends cu{constructor(t=1){const n=[0,0,0,t,0,0,0,0,0,0,t,0,0,0,0,0,0,t],s=[1,0,0,1,.6,0,0,1,0,.6,1,0,0,0,1,0,.6,1],l=new Zn;l.setAttribute("position",new Tn(n,3)),l.setAttribute("color",new Tn(s,3));const c=new lu({vertexColors:!0,toneMapped:!1});super(l,c),this.type="AxesHelper"}setColors(t,n,s){const l=new Te,c=this.geometry.attributes.color.array;return l.set(t),l.toArray(c,0),l.toArray(c,3),l.set(n),l.toArray(c,6),l.toArray(c,9),l.set(s),l.toArray(c,12),l.toArray(c,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class Db extends Ps{constructor(t,n=null){super(),this.object=t,this.domElement=n,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){fe("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}}function Wg(r,t,n,s){const l=Ub(s);switch(n){case T_:return r*t;case R_:return r*t/l.components*l.byteLength;case rp:return r*t/l.components*l.byteLength;case op:return r*t*2/l.components*l.byteLength;case lp:return r*t*2/l.components*l.byteLength;case A_:return r*t*3/l.components*l.byteLength;case Ci:return r*t*4/l.components*l.byteLength;case cp:return r*t*4/l.components*l.byteLength;case jc:case Zc:return Math.floor((r+3)/4)*Math.floor((t+3)/4)*8;case Kc:case Qc:return Math.floor((r+3)/4)*Math.floor((t+3)/4)*16;case Md:case Ed:return Math.max(r,16)*Math.max(t,8)/4;case Sd:case bd:return Math.max(r,8)*Math.max(t,8)/2;case Td:case Ad:return Math.floor((r+3)/4)*Math.floor((t+3)/4)*8;case Rd:return Math.floor((r+3)/4)*Math.floor((t+3)/4)*16;case Cd:return Math.floor((r+3)/4)*Math.floor((t+3)/4)*16;case wd:return Math.floor((r+4)/5)*Math.floor((t+3)/4)*16;case Dd:return Math.floor((r+4)/5)*Math.floor((t+4)/5)*16;case Ud:return Math.floor((r+5)/6)*Math.floor((t+4)/5)*16;case Ld:return Math.floor((r+5)/6)*Math.floor((t+5)/6)*16;case Nd:return Math.floor((r+7)/8)*Math.floor((t+4)/5)*16;case Od:return Math.floor((r+7)/8)*Math.floor((t+5)/6)*16;case Pd:return Math.floor((r+7)/8)*Math.floor((t+7)/8)*16;case zd:return Math.floor((r+9)/10)*Math.floor((t+4)/5)*16;case Bd:return Math.floor((r+9)/10)*Math.floor((t+5)/6)*16;case Fd:return Math.floor((r+9)/10)*Math.floor((t+7)/8)*16;case Id:return Math.floor((r+9)/10)*Math.floor((t+9)/10)*16;case Hd:return Math.floor((r+11)/12)*Math.floor((t+9)/10)*16;case Gd:return Math.floor((r+11)/12)*Math.floor((t+11)/12)*16;case Vd:case kd:case Xd:return Math.ceil(r/4)*Math.ceil(t/4)*16;case Wd:case qd:return Math.ceil(r/4)*Math.ceil(t/4)*8;case Yd:case jd:return Math.ceil(r/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${n} format.`)}function Ub(r){switch(r){case Fi:case S_:return{byteLength:1,components:1};case Jo:case M_:case Ir:return{byteLength:2,components:1};case ap:case sp:return{byteLength:2,components:4};case Ls:case ip:case ga:return{byteLength:4,components:1};case b_:case E_:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${r}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:np}}));typeof window<"u"&&(window.__THREE__?fe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=np);function $_(){let r=null,t=!1,n=null,s=null;function l(c,f){n(c,f),s=r.requestAnimationFrame(l)}return{start:function(){t!==!0&&n!==null&&(s=r.requestAnimationFrame(l),t=!0)},stop:function(){r.cancelAnimationFrame(s),t=!1},setAnimationLoop:function(c){n=c},setContext:function(c){r=c}}}function Lb(r){const t=new WeakMap;function n(d,m){const p=d.array,x=d.usage,g=p.byteLength,_=r.createBuffer();r.bindBuffer(m,_),r.bufferData(m,p,x),d.onUploadCallback();let S;if(p instanceof Float32Array)S=r.FLOAT;else if(typeof Float16Array<"u"&&p instanceof Float16Array)S=r.HALF_FLOAT;else if(p instanceof Uint16Array)d.isFloat16BufferAttribute?S=r.HALF_FLOAT:S=r.UNSIGNED_SHORT;else if(p instanceof Int16Array)S=r.SHORT;else if(p instanceof Uint32Array)S=r.UNSIGNED_INT;else if(p instanceof Int32Array)S=r.INT;else if(p instanceof Int8Array)S=r.BYTE;else if(p instanceof Uint8Array)S=r.UNSIGNED_BYTE;else if(p instanceof Uint8ClampedArray)S=r.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+p);return{buffer:_,type:S,bytesPerElement:p.BYTES_PER_ELEMENT,version:d.version,size:g}}function s(d,m,p){const x=m.array,g=m.updateRanges;if(r.bindBuffer(p,d),g.length===0)r.bufferSubData(p,0,x);else{g.sort((S,b)=>S.start-b.start);let _=0;for(let S=1;S<g.length;S++){const b=g[_],A=g[S];A.start<=b.start+b.count+1?b.count=Math.max(b.count,A.start+A.count-b.start):(++_,g[_]=A)}g.length=_+1;for(let S=0,b=g.length;S<b;S++){const A=g[S];r.bufferSubData(p,A.start*x.BYTES_PER_ELEMENT,x,A.start,A.count)}m.clearUpdateRanges()}m.onUploadCallback()}function l(d){return d.isInterleavedBufferAttribute&&(d=d.data),t.get(d)}function c(d){d.isInterleavedBufferAttribute&&(d=d.data);const m=t.get(d);m&&(r.deleteBuffer(m.buffer),t.delete(d))}function f(d,m){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const x=t.get(d);(!x||x.version<d.version)&&t.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const p=t.get(d);if(p===void 0)t.set(d,n(d,m));else if(p.version<d.version){if(p.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");s(p.buffer,d,m),p.version=d.version}}return{get:l,remove:c,update:f}}var Nb=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Ob=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Pb=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,zb=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Bb=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Fb=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Ib=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Hb=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Gb=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Vb=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,kb=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Xb=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Wb=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,qb=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Yb=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,jb=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Zb=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Kb=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Qb=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Jb=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,$b=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,t1=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,e1=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,n1=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,i1=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,a1=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,s1=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,r1=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,o1=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,l1=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,c1="gl_FragColor = linearToOutputTexel( gl_FragColor );",u1=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,f1=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,h1=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,d1=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,p1=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,m1=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,x1=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,g1=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,_1=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,v1=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,y1=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,S1=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,M1=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,b1=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,E1=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,T1=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,A1=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,R1=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,C1=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,w1=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,D1=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,U1=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 uv = vec2( roughness, dotNV );
	return texture2D( dfgLUT, uv ).rg;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNV * dotNV), 0.0, dotNV), material.roughness );
	vec2 dfgL = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNL * dotNL), 0.0, dotNL), material.roughness );
	vec3 FssEss_V = material.specularColor * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColor * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColor + ( 1.0 - material.specularColor ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,L1=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,N1=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,O1=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,P1=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,z1=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,B1=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,F1=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,I1=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,H1=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,G1=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,V1=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,k1=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,X1=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,W1=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,q1=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Y1=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,j1=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Z1=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,K1=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Q1=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,J1=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,$1=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,t3=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,e3=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,n3=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,i3=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,a3=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,s3=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,r3=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,o3=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,l3=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,c3=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,u3=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,f3=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,h3=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,d3=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,p3=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,m3=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,x3=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,g3=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,_3=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,v3=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,y3=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,S3=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,M3=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,b3=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,E3=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,T3=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,A3=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,R3=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,C3=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,w3=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,D3=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,U3=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const L3=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,N3=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,O3=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,P3=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,z3=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,B3=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,F3=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,I3=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,H3=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,G3=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,V3=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,k3=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,X3=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,W3=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,q3=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Y3=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,j3=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Z3=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,K3=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Q3=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,J3=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,$3=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,tE=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,eE=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,nE=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,iE=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,aE=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,sE=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,rE=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,oE=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,lE=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,cE=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,uE=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,fE=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ve={alphahash_fragment:Nb,alphahash_pars_fragment:Ob,alphamap_fragment:Pb,alphamap_pars_fragment:zb,alphatest_fragment:Bb,alphatest_pars_fragment:Fb,aomap_fragment:Ib,aomap_pars_fragment:Hb,batching_pars_vertex:Gb,batching_vertex:Vb,begin_vertex:kb,beginnormal_vertex:Xb,bsdfs:Wb,iridescence_fragment:qb,bumpmap_pars_fragment:Yb,clipping_planes_fragment:jb,clipping_planes_pars_fragment:Zb,clipping_planes_pars_vertex:Kb,clipping_planes_vertex:Qb,color_fragment:Jb,color_pars_fragment:$b,color_pars_vertex:t1,color_vertex:e1,common:n1,cube_uv_reflection_fragment:i1,defaultnormal_vertex:a1,displacementmap_pars_vertex:s1,displacementmap_vertex:r1,emissivemap_fragment:o1,emissivemap_pars_fragment:l1,colorspace_fragment:c1,colorspace_pars_fragment:u1,envmap_fragment:f1,envmap_common_pars_fragment:h1,envmap_pars_fragment:d1,envmap_pars_vertex:p1,envmap_physical_pars_fragment:T1,envmap_vertex:m1,fog_vertex:x1,fog_pars_vertex:g1,fog_fragment:_1,fog_pars_fragment:v1,gradientmap_pars_fragment:y1,lightmap_pars_fragment:S1,lights_lambert_fragment:M1,lights_lambert_pars_fragment:b1,lights_pars_begin:E1,lights_toon_fragment:A1,lights_toon_pars_fragment:R1,lights_phong_fragment:C1,lights_phong_pars_fragment:w1,lights_physical_fragment:D1,lights_physical_pars_fragment:U1,lights_fragment_begin:L1,lights_fragment_maps:N1,lights_fragment_end:O1,logdepthbuf_fragment:P1,logdepthbuf_pars_fragment:z1,logdepthbuf_pars_vertex:B1,logdepthbuf_vertex:F1,map_fragment:I1,map_pars_fragment:H1,map_particle_fragment:G1,map_particle_pars_fragment:V1,metalnessmap_fragment:k1,metalnessmap_pars_fragment:X1,morphinstance_vertex:W1,morphcolor_vertex:q1,morphnormal_vertex:Y1,morphtarget_pars_vertex:j1,morphtarget_vertex:Z1,normal_fragment_begin:K1,normal_fragment_maps:Q1,normal_pars_fragment:J1,normal_pars_vertex:$1,normal_vertex:t3,normalmap_pars_fragment:e3,clearcoat_normal_fragment_begin:n3,clearcoat_normal_fragment_maps:i3,clearcoat_pars_fragment:a3,iridescence_pars_fragment:s3,opaque_fragment:r3,packing:o3,premultiplied_alpha_fragment:l3,project_vertex:c3,dithering_fragment:u3,dithering_pars_fragment:f3,roughnessmap_fragment:h3,roughnessmap_pars_fragment:d3,shadowmap_pars_fragment:p3,shadowmap_pars_vertex:m3,shadowmap_vertex:x3,shadowmask_pars_fragment:g3,skinbase_vertex:_3,skinning_pars_vertex:v3,skinning_vertex:y3,skinnormal_vertex:S3,specularmap_fragment:M3,specularmap_pars_fragment:b3,tonemapping_fragment:E3,tonemapping_pars_fragment:T3,transmission_fragment:A3,transmission_pars_fragment:R3,uv_pars_fragment:C3,uv_pars_vertex:w3,uv_vertex:D3,worldpos_vertex:U3,background_vert:L3,background_frag:N3,backgroundCube_vert:O3,backgroundCube_frag:P3,cube_vert:z3,cube_frag:B3,depth_vert:F3,depth_frag:I3,distanceRGBA_vert:H3,distanceRGBA_frag:G3,equirect_vert:V3,equirect_frag:k3,linedashed_vert:X3,linedashed_frag:W3,meshbasic_vert:q3,meshbasic_frag:Y3,meshlambert_vert:j3,meshlambert_frag:Z3,meshmatcap_vert:K3,meshmatcap_frag:Q3,meshnormal_vert:J3,meshnormal_frag:$3,meshphong_vert:tE,meshphong_frag:eE,meshphysical_vert:nE,meshphysical_frag:iE,meshtoon_vert:aE,meshtoon_frag:sE,points_vert:rE,points_frag:oE,shadow_vert:lE,shadow_frag:cE,sprite_vert:uE,sprite_frag:fE},It={common:{diffuse:{value:new Te(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new _e},alphaMap:{value:null},alphaMapTransform:{value:new _e},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new _e}},envmap:{envMap:{value:null},envMapRotation:{value:new _e},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new _e}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new _e}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new _e},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new _e},normalScale:{value:new Nt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new _e},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new _e}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new _e}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new _e}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Te(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Te(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new _e},alphaTest:{value:0},uvTransform:{value:new _e}},sprite:{diffuse:{value:new Te(16777215)},opacity:{value:1},center:{value:new Nt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new _e},alphaMap:{value:null},alphaMapTransform:{value:new _e},alphaTest:{value:0}}},Pi={basic:{uniforms:Fn([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.fog]),vertexShader:ve.meshbasic_vert,fragmentShader:ve.meshbasic_frag},lambert:{uniforms:Fn([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.fog,It.lights,{emissive:{value:new Te(0)}}]),vertexShader:ve.meshlambert_vert,fragmentShader:ve.meshlambert_frag},phong:{uniforms:Fn([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.fog,It.lights,{emissive:{value:new Te(0)},specular:{value:new Te(1118481)},shininess:{value:30}}]),vertexShader:ve.meshphong_vert,fragmentShader:ve.meshphong_frag},standard:{uniforms:Fn([It.common,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.roughnessmap,It.metalnessmap,It.fog,It.lights,{emissive:{value:new Te(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ve.meshphysical_vert,fragmentShader:ve.meshphysical_frag},toon:{uniforms:Fn([It.common,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.gradientmap,It.fog,It.lights,{emissive:{value:new Te(0)}}]),vertexShader:ve.meshtoon_vert,fragmentShader:ve.meshtoon_frag},matcap:{uniforms:Fn([It.common,It.bumpmap,It.normalmap,It.displacementmap,It.fog,{matcap:{value:null}}]),vertexShader:ve.meshmatcap_vert,fragmentShader:ve.meshmatcap_frag},points:{uniforms:Fn([It.points,It.fog]),vertexShader:ve.points_vert,fragmentShader:ve.points_frag},dashed:{uniforms:Fn([It.common,It.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ve.linedashed_vert,fragmentShader:ve.linedashed_frag},depth:{uniforms:Fn([It.common,It.displacementmap]),vertexShader:ve.depth_vert,fragmentShader:ve.depth_frag},normal:{uniforms:Fn([It.common,It.bumpmap,It.normalmap,It.displacementmap,{opacity:{value:1}}]),vertexShader:ve.meshnormal_vert,fragmentShader:ve.meshnormal_frag},sprite:{uniforms:Fn([It.sprite,It.fog]),vertexShader:ve.sprite_vert,fragmentShader:ve.sprite_frag},background:{uniforms:{uvTransform:{value:new _e},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ve.background_vert,fragmentShader:ve.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new _e}},vertexShader:ve.backgroundCube_vert,fragmentShader:ve.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ve.cube_vert,fragmentShader:ve.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ve.equirect_vert,fragmentShader:ve.equirect_frag},distanceRGBA:{uniforms:Fn([It.common,It.displacementmap,{referencePosition:{value:new Y},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ve.distanceRGBA_vert,fragmentShader:ve.distanceRGBA_frag},shadow:{uniforms:Fn([It.lights,It.fog,{color:{value:new Te(0)},opacity:{value:1}}]),vertexShader:ve.shadow_vert,fragmentShader:ve.shadow_frag}};Pi.physical={uniforms:Fn([Pi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new _e},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new _e},clearcoatNormalScale:{value:new Nt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new _e},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new _e},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new _e},sheen:{value:0},sheenColor:{value:new Te(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new _e},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new _e},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new _e},transmissionSamplerSize:{value:new Nt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new _e},attenuationDistance:{value:0},attenuationColor:{value:new Te(0)},specularColor:{value:new Te(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new _e},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new _e},anisotropyVector:{value:new Nt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new _e}}]),vertexShader:ve.meshphysical_vert,fragmentShader:ve.meshphysical_frag};const Xc={r:0,b:0,g:0},As=new Ii,hE=new tn;function dE(r,t,n,s,l,c,f){const d=new Te(0);let m=c===!0?0:1,p,x,g=null,_=0,S=null;function b(w){let O=w.isScene===!0?w.background:null;return O&&O.isTexture&&(O=(w.backgroundBlurriness>0?n:t).get(O)),O}function A(w){let O=!1;const k=b(w);k===null?y(d,m):k&&k.isColor&&(y(k,1),O=!0);const P=r.xr.getEnvironmentBlendMode();P==="additive"?s.buffers.color.setClear(0,0,0,1,f):P==="alpha-blend"&&s.buffers.color.setClear(0,0,0,0,f),(r.autoClear||O)&&(s.buffers.depth.setTest(!0),s.buffers.depth.setMask(!0),s.buffers.color.setMask(!0),r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil))}function M(w,O){const k=b(O);k&&(k.isCubeTexture||k.mapping===ru)?(x===void 0&&(x=new Hi(new Vr(1,1,1),new ya({name:"BackgroundCubeMaterial",uniforms:Br(Pi.backgroundCube.uniforms),vertexShader:Pi.backgroundCube.vertexShader,fragmentShader:Pi.backgroundCube.fragmentShader,side:jn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),x.geometry.deleteAttribute("normal"),x.geometry.deleteAttribute("uv"),x.onBeforeRender=function(P,F,Q){this.matrixWorld.copyPosition(Q.matrixWorld)},Object.defineProperty(x.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),l.update(x)),As.copy(O.backgroundRotation),As.x*=-1,As.y*=-1,As.z*=-1,k.isCubeTexture&&k.isRenderTargetTexture===!1&&(As.y*=-1,As.z*=-1),x.material.uniforms.envMap.value=k,x.material.uniforms.flipEnvMap.value=k.isCubeTexture&&k.isRenderTargetTexture===!1?-1:1,x.material.uniforms.backgroundBlurriness.value=O.backgroundBlurriness,x.material.uniforms.backgroundIntensity.value=O.backgroundIntensity,x.material.uniforms.backgroundRotation.value.setFromMatrix4(hE.makeRotationFromEuler(As)),x.material.toneMapped=Oe.getTransfer(k.colorSpace)!==Xe,(g!==k||_!==k.version||S!==r.toneMapping)&&(x.material.needsUpdate=!0,g=k,_=k.version,S=r.toneMapping),x.layers.enableAll(),w.unshift(x,x.geometry,x.material,0,0,null)):k&&k.isTexture&&(p===void 0&&(p=new Hi(new uu(2,2),new ya({name:"BackgroundMaterial",uniforms:Br(Pi.background.uniforms),vertexShader:Pi.background.vertexShader,fragmentShader:Pi.background.fragmentShader,side:ns,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),p.geometry.deleteAttribute("normal"),Object.defineProperty(p.material,"map",{get:function(){return this.uniforms.t2D.value}}),l.update(p)),p.material.uniforms.t2D.value=k,p.material.uniforms.backgroundIntensity.value=O.backgroundIntensity,p.material.toneMapped=Oe.getTransfer(k.colorSpace)!==Xe,k.matrixAutoUpdate===!0&&k.updateMatrix(),p.material.uniforms.uvTransform.value.copy(k.matrix),(g!==k||_!==k.version||S!==r.toneMapping)&&(p.material.needsUpdate=!0,g=k,_=k.version,S=r.toneMapping),p.layers.enableAll(),w.unshift(p,p.geometry,p.material,0,0,null))}function y(w,O){w.getRGB(Xc,B_(r)),s.buffers.color.setClear(Xc.r,Xc.g,Xc.b,O,f)}function z(){x!==void 0&&(x.geometry.dispose(),x.material.dispose(),x=void 0),p!==void 0&&(p.geometry.dispose(),p.material.dispose(),p=void 0)}return{getClearColor:function(){return d},setClearColor:function(w,O=1){d.set(w),m=O,y(d,m)},getClearAlpha:function(){return m},setClearAlpha:function(w){m=w,y(d,m)},render:A,addToRenderList:M,dispose:z}}function pE(r,t){const n=r.getParameter(r.MAX_VERTEX_ATTRIBS),s={},l=_(null);let c=l,f=!1;function d(C,H,nt,ct,pt){let lt=!1;const B=g(ct,nt,H);c!==B&&(c=B,p(c.object)),lt=S(C,ct,nt,pt),lt&&b(C,ct,nt,pt),pt!==null&&t.update(pt,r.ELEMENT_ARRAY_BUFFER),(lt||f)&&(f=!1,O(C,H,nt,ct),pt!==null&&r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,t.get(pt).buffer))}function m(){return r.createVertexArray()}function p(C){return r.bindVertexArray(C)}function x(C){return r.deleteVertexArray(C)}function g(C,H,nt){const ct=nt.wireframe===!0;let pt=s[C.id];pt===void 0&&(pt={},s[C.id]=pt);let lt=pt[H.id];lt===void 0&&(lt={},pt[H.id]=lt);let B=lt[ct];return B===void 0&&(B=_(m()),lt[ct]=B),B}function _(C){const H=[],nt=[],ct=[];for(let pt=0;pt<n;pt++)H[pt]=0,nt[pt]=0,ct[pt]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:H,enabledAttributes:nt,attributeDivisors:ct,object:C,attributes:{},index:null}}function S(C,H,nt,ct){const pt=c.attributes,lt=H.attributes;let B=0;const q=nt.getAttributes();for(const j in q)if(q[j].location>=0){const vt=pt[j];let N=lt[j];if(N===void 0&&(j==="instanceMatrix"&&C.instanceMatrix&&(N=C.instanceMatrix),j==="instanceColor"&&C.instanceColor&&(N=C.instanceColor)),vt===void 0||vt.attribute!==N||N&&vt.data!==N.data)return!0;B++}return c.attributesNum!==B||c.index!==ct}function b(C,H,nt,ct){const pt={},lt=H.attributes;let B=0;const q=nt.getAttributes();for(const j in q)if(q[j].location>=0){let vt=lt[j];vt===void 0&&(j==="instanceMatrix"&&C.instanceMatrix&&(vt=C.instanceMatrix),j==="instanceColor"&&C.instanceColor&&(vt=C.instanceColor));const N={};N.attribute=vt,vt&&vt.data&&(N.data=vt.data),pt[j]=N,B++}c.attributes=pt,c.attributesNum=B,c.index=ct}function A(){const C=c.newAttributes;for(let H=0,nt=C.length;H<nt;H++)C[H]=0}function M(C){y(C,0)}function y(C,H){const nt=c.newAttributes,ct=c.enabledAttributes,pt=c.attributeDivisors;nt[C]=1,ct[C]===0&&(r.enableVertexAttribArray(C),ct[C]=1),pt[C]!==H&&(r.vertexAttribDivisor(C,H),pt[C]=H)}function z(){const C=c.newAttributes,H=c.enabledAttributes;for(let nt=0,ct=H.length;nt<ct;nt++)H[nt]!==C[nt]&&(r.disableVertexAttribArray(nt),H[nt]=0)}function w(C,H,nt,ct,pt,lt,B){B===!0?r.vertexAttribIPointer(C,H,nt,pt,lt):r.vertexAttribPointer(C,H,nt,ct,pt,lt)}function O(C,H,nt,ct){A();const pt=ct.attributes,lt=nt.getAttributes(),B=H.defaultAttributeValues;for(const q in lt){const j=lt[q];if(j.location>=0){let xt=pt[q];if(xt===void 0&&(q==="instanceMatrix"&&C.instanceMatrix&&(xt=C.instanceMatrix),q==="instanceColor"&&C.instanceColor&&(xt=C.instanceColor)),xt!==void 0){const vt=xt.normalized,N=xt.itemSize,it=t.get(xt);if(it===void 0)continue;const _t=it.buffer,Rt=it.type,Gt=it.bytesPerElement,at=Rt===r.INT||Rt===r.UNSIGNED_INT||xt.gpuType===ip;if(xt.isInterleavedBufferAttribute){const ut=xt.data,Ot=ut.stride,Ht=xt.offset;if(ut.isInstancedInterleavedBuffer){for(let Zt=0;Zt<j.locationSize;Zt++)y(j.location+Zt,ut.meshPerAttribute);C.isInstancedMesh!==!0&&ct._maxInstanceCount===void 0&&(ct._maxInstanceCount=ut.meshPerAttribute*ut.count)}else for(let Zt=0;Zt<j.locationSize;Zt++)M(j.location+Zt);r.bindBuffer(r.ARRAY_BUFFER,_t);for(let Zt=0;Zt<j.locationSize;Zt++)w(j.location+Zt,N/j.locationSize,Rt,vt,Ot*Gt,(Ht+N/j.locationSize*Zt)*Gt,at)}else{if(xt.isInstancedBufferAttribute){for(let ut=0;ut<j.locationSize;ut++)y(j.location+ut,xt.meshPerAttribute);C.isInstancedMesh!==!0&&ct._maxInstanceCount===void 0&&(ct._maxInstanceCount=xt.meshPerAttribute*xt.count)}else for(let ut=0;ut<j.locationSize;ut++)M(j.location+ut);r.bindBuffer(r.ARRAY_BUFFER,_t);for(let ut=0;ut<j.locationSize;ut++)w(j.location+ut,N/j.locationSize,Rt,vt,N*Gt,N/j.locationSize*ut*Gt,at)}}else if(B!==void 0){const vt=B[q];if(vt!==void 0)switch(vt.length){case 2:r.vertexAttrib2fv(j.location,vt);break;case 3:r.vertexAttrib3fv(j.location,vt);break;case 4:r.vertexAttrib4fv(j.location,vt);break;default:r.vertexAttrib1fv(j.location,vt)}}}}z()}function k(){Q();for(const C in s){const H=s[C];for(const nt in H){const ct=H[nt];for(const pt in ct)x(ct[pt].object),delete ct[pt];delete H[nt]}delete s[C]}}function P(C){if(s[C.id]===void 0)return;const H=s[C.id];for(const nt in H){const ct=H[nt];for(const pt in ct)x(ct[pt].object),delete ct[pt];delete H[nt]}delete s[C.id]}function F(C){for(const H in s){const nt=s[H];if(nt[C.id]===void 0)continue;const ct=nt[C.id];for(const pt in ct)x(ct[pt].object),delete ct[pt];delete nt[C.id]}}function Q(){D(),f=!0,c!==l&&(c=l,p(c.object))}function D(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:d,reset:Q,resetDefaultState:D,dispose:k,releaseStatesOfGeometry:P,releaseStatesOfProgram:F,initAttributes:A,enableAttribute:M,disableUnusedAttributes:z}}function mE(r,t,n){let s;function l(p){s=p}function c(p,x){r.drawArrays(s,p,x),n.update(x,s,1)}function f(p,x,g){g!==0&&(r.drawArraysInstanced(s,p,x,g),n.update(x,s,g))}function d(p,x,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(s,p,0,x,0,g);let S=0;for(let b=0;b<g;b++)S+=x[b];n.update(S,s,1)}function m(p,x,g,_){if(g===0)return;const S=t.get("WEBGL_multi_draw");if(S===null)for(let b=0;b<p.length;b++)f(p[b],x[b],_[b]);else{S.multiDrawArraysInstancedWEBGL(s,p,0,x,0,_,0,g);let b=0;for(let A=0;A<g;A++)b+=x[A]*_[A];n.update(b,s,1)}}this.setMode=l,this.render=c,this.renderInstances=f,this.renderMultiDraw=d,this.renderMultiDrawInstances=m}function xE(r,t,n,s){let l;function c(){if(l!==void 0)return l;if(t.has("EXT_texture_filter_anisotropic")===!0){const F=t.get("EXT_texture_filter_anisotropic");l=r.getParameter(F.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else l=0;return l}function f(F){return!(F!==Ci&&s.convert(F)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(F){const Q=F===Ir&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(F!==Fi&&s.convert(F)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_TYPE)&&F!==ga&&!Q)}function m(F){if(F==="highp"){if(r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.HIGH_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.HIGH_FLOAT).precision>0)return"highp";F="mediump"}return F==="mediump"&&r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.MEDIUM_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let p=n.precision!==void 0?n.precision:"highp";const x=m(p);x!==p&&(fe("WebGLRenderer:",p,"not supported, using",x,"instead."),p=x);const g=n.logarithmicDepthBuffer===!0,_=n.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),S=r.getParameter(r.MAX_TEXTURE_IMAGE_UNITS),b=r.getParameter(r.MAX_VERTEX_TEXTURE_IMAGE_UNITS),A=r.getParameter(r.MAX_TEXTURE_SIZE),M=r.getParameter(r.MAX_CUBE_MAP_TEXTURE_SIZE),y=r.getParameter(r.MAX_VERTEX_ATTRIBS),z=r.getParameter(r.MAX_VERTEX_UNIFORM_VECTORS),w=r.getParameter(r.MAX_VARYING_VECTORS),O=r.getParameter(r.MAX_FRAGMENT_UNIFORM_VECTORS),k=b>0,P=r.getParameter(r.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:c,getMaxPrecision:m,textureFormatReadable:f,textureTypeReadable:d,precision:p,logarithmicDepthBuffer:g,reversedDepthBuffer:_,maxTextures:S,maxVertexTextures:b,maxTextureSize:A,maxCubemapSize:M,maxAttributes:y,maxVertexUniforms:z,maxVaryings:w,maxFragmentUniforms:O,vertexTextures:k,maxSamples:P}}function gE(r){const t=this;let n=null,s=0,l=!1,c=!1;const f=new Ja,d=new _e,m={value:null,needsUpdate:!1};this.uniform=m,this.numPlanes=0,this.numIntersection=0,this.init=function(g,_){const S=g.length!==0||_||s!==0||l;return l=_,s=g.length,S},this.beginShadows=function(){c=!0,x(null)},this.endShadows=function(){c=!1},this.setGlobalState=function(g,_){n=x(g,_,0)},this.setState=function(g,_,S){const b=g.clippingPlanes,A=g.clipIntersection,M=g.clipShadows,y=r.get(g);if(!l||b===null||b.length===0||c&&!M)c?x(null):p();else{const z=c?0:s,w=z*4;let O=y.clippingState||null;m.value=O,O=x(b,_,w,S);for(let k=0;k!==w;++k)O[k]=n[k];y.clippingState=O,this.numIntersection=A?this.numPlanes:0,this.numPlanes+=z}};function p(){m.value!==n&&(m.value=n,m.needsUpdate=s>0),t.numPlanes=s,t.numIntersection=0}function x(g,_,S,b){const A=g!==null?g.length:0;let M=null;if(A!==0){if(M=m.value,b!==!0||M===null){const y=S+A*4,z=_.matrixWorldInverse;d.getNormalMatrix(z),(M===null||M.length<y)&&(M=new Float32Array(y));for(let w=0,O=S;w!==A;++w,O+=4)f.copy(g[w]).applyMatrix4(z,d),f.normal.toArray(M,O),M[O+3]=f.constant}m.value=M,m.needsUpdate=!0}return t.numPlanes=A,t.numIntersection=0,M}}function _E(r){let t=new WeakMap;function n(f,d){return d===gd?f.mapping=Or:d===_d&&(f.mapping=Pr),f}function s(f){if(f&&f.isTexture){const d=f.mapping;if(d===gd||d===_d)if(t.has(f)){const m=t.get(f).texture;return n(m,f.mapping)}else{const m=f.image;if(m&&m.height>0){const p=new NM(m.height);return p.fromEquirectangularTexture(r,f),t.set(f,p),f.addEventListener("dispose",l),n(p.texture,f.mapping)}else return null}}return f}function l(f){const d=f.target;d.removeEventListener("dispose",l);const m=t.get(d);m!==void 0&&(t.delete(d),m.dispose())}function c(){t=new WeakMap}return{get:s,dispose:c}}const ts=4,qg=[.125,.215,.35,.446,.526,.582],Ds=20,vE=256,Wo=new J_,Yg=new Te;let nd=null,id=0,ad=0,sd=!1;const yE=new Y;class jg{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,n=0,s=.1,l=100,c={}){const{size:f=256,position:d=yE}=c;nd=this._renderer.getRenderTarget(),id=this._renderer.getActiveCubeFace(),ad=this._renderer.getActiveMipmapLevel(),sd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(f);const m=this._allocateTargets();return m.depthBuffer=!0,this._sceneToCubeUV(t,s,l,m,d),n>0&&this._blur(m,0,0,n),this._applyPMREM(m),this._cleanup(m),m}fromEquirectangular(t,n=null){return this._fromTexture(t,n)}fromCubemap(t,n=null){return this._fromTexture(t,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Qg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Kg(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(nd,id,ad),this._renderer.xr.enabled=sd,t.scissorTest=!1,Rr(t,0,0,t.width,t.height)}_fromTexture(t,n){t.mapping===Or||t.mapping===Pr?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),nd=this._renderer.getRenderTarget(),id=this._renderer.getActiveCubeFace(),ad=this._renderer.getActiveMipmapLevel(),sd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const s=n||this._allocateTargets();return this._textureToCubeUV(t,s),this._applyPMREM(s),this._cleanup(s),s}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,s={magFilter:yi,minFilter:yi,generateMipmaps:!1,type:Ir,format:Ci,colorSpace:zr,depthBuffer:!1},l=Zg(t,n,s);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Zg(t,n,s);const{_lodMax:c}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=SE(c)),this._blurMaterial=bE(c,t,n),this._ggxMaterial=ME(c,t,n)}return l}_compileMaterial(t){const n=new Hi(new Zn,t);this._renderer.compile(n,Wo)}_sceneToCubeUV(t,n,s,l,c){const m=new _i(90,1,n,s),p=[1,-1,1,1,1,1],x=[1,1,1,-1,-1,-1],g=this._renderer,_=g.autoClear,S=g.toneMapping;g.getClearColor(Yg),g.toneMapping=es,g.autoClear=!1,g.state.buffers.depth.getReversed()&&(g.setRenderTarget(l),g.clearDepth(),g.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Hi(new Vr,new O_({name:"PMREM.Background",side:jn,depthWrite:!1,depthTest:!1})));const A=this._backgroundBox,M=A.material;let y=!1;const z=t.background;z?z.isColor&&(M.color.copy(z),t.background=null,y=!0):(M.color.copy(Yg),y=!0);for(let w=0;w<6;w++){const O=w%3;O===0?(m.up.set(0,p[w],0),m.position.set(c.x,c.y,c.z),m.lookAt(c.x+x[w],c.y,c.z)):O===1?(m.up.set(0,0,p[w]),m.position.set(c.x,c.y,c.z),m.lookAt(c.x,c.y+x[w],c.z)):(m.up.set(0,p[w],0),m.position.set(c.x,c.y,c.z),m.lookAt(c.x,c.y,c.z+x[w]));const k=this._cubeSize;Rr(l,O*k,w>2?k:0,k,k),g.setRenderTarget(l),y&&g.render(A,m),g.render(t,m)}g.toneMapping=S,g.autoClear=_,t.background=z}_textureToCubeUV(t,n){const s=this._renderer,l=t.mapping===Or||t.mapping===Pr;l?(this._cubemapMaterial===null&&(this._cubemapMaterial=Qg()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Kg());const c=l?this._cubemapMaterial:this._equirectMaterial,f=this._lodMeshes[0];f.material=c;const d=c.uniforms;d.envMap.value=t;const m=this._cubeSize;Rr(n,0,0,3*m,2*m),s.setRenderTarget(n),s.render(f,Wo)}_applyPMREM(t){const n=this._renderer,s=n.autoClear;n.autoClear=!1;const l=this._lodMeshes.length;for(let c=1;c<l;c++)this._applyGGXFilter(t,c-1,c);n.autoClear=s}_applyGGXFilter(t,n,s){const l=this._renderer,c=this._pingPongRenderTarget,f=this._ggxMaterial,d=this._lodMeshes[s];d.material=f;const m=f.uniforms,p=s/(this._lodMeshes.length-1),x=n/(this._lodMeshes.length-1),g=Math.sqrt(p*p-x*x),_=.05+p*.95,S=g*_,{_lodMax:b}=this,A=this._sizeLods[s],M=3*A*(s>b-ts?s-b+ts:0),y=4*(this._cubeSize-A);m.envMap.value=t.texture,m.roughness.value=S,m.mipInt.value=b-n,Rr(c,M,y,3*A,2*A),l.setRenderTarget(c),l.render(d,Wo),m.envMap.value=c.texture,m.roughness.value=0,m.mipInt.value=b-s,Rr(t,M,y,3*A,2*A),l.setRenderTarget(t),l.render(d,Wo)}_blur(t,n,s,l,c){const f=this._pingPongRenderTarget;this._halfBlur(t,f,n,s,l,"latitudinal",c),this._halfBlur(f,t,s,s,l,"longitudinal",c)}_halfBlur(t,n,s,l,c,f,d){const m=this._renderer,p=this._blurMaterial;f!=="latitudinal"&&f!=="longitudinal"&&an("blur direction must be either latitudinal or longitudinal!");const x=3,g=this._lodMeshes[l];g.material=p;const _=p.uniforms,S=this._sizeLods[s]-1,b=isFinite(c)?Math.PI/(2*S):2*Math.PI/(2*Ds-1),A=c/b,M=isFinite(c)?1+Math.floor(x*A):Ds;M>Ds&&fe(`sigmaRadians, ${c}, is too large and will clip, as it requested ${M} samples when the maximum is set to ${Ds}`);const y=[];let z=0;for(let F=0;F<Ds;++F){const Q=F/A,D=Math.exp(-Q*Q/2);y.push(D),F===0?z+=D:F<M&&(z+=2*D)}for(let F=0;F<y.length;F++)y[F]=y[F]/z;_.envMap.value=t.texture,_.samples.value=M,_.weights.value=y,_.latitudinal.value=f==="latitudinal",d&&(_.poleAxis.value=d);const{_lodMax:w}=this;_.dTheta.value=b,_.mipInt.value=w-s;const O=this._sizeLods[l],k=3*O*(l>w-ts?l-w+ts:0),P=4*(this._cubeSize-O);Rr(n,k,P,3*O,2*O),m.setRenderTarget(n),m.render(g,Wo)}}function SE(r){const t=[],n=[],s=[];let l=r;const c=r-ts+1+qg.length;for(let f=0;f<c;f++){const d=Math.pow(2,l);t.push(d);let m=1/d;f>r-ts?m=qg[f-r+ts-1]:f===0&&(m=0),n.push(m);const p=1/(d-2),x=-p,g=1+p,_=[x,x,g,x,g,g,x,x,g,g,x,g],S=6,b=6,A=3,M=2,y=1,z=new Float32Array(A*b*S),w=new Float32Array(M*b*S),O=new Float32Array(y*b*S);for(let P=0;P<S;P++){const F=P%3*2/3-1,Q=P>2?0:-1,D=[F,Q,0,F+2/3,Q,0,F+2/3,Q+1,0,F,Q,0,F+2/3,Q+1,0,F,Q+1,0];z.set(D,A*b*P),w.set(_,M*b*P);const C=[P,P,P,P,P,P];O.set(C,y*b*P)}const k=new Zn;k.setAttribute("position",new Bi(z,A)),k.setAttribute("uv",new Bi(w,M)),k.setAttribute("faceIndex",new Bi(O,y)),s.push(new Hi(k,null)),l>ts&&l--}return{lodMeshes:s,sizeLods:t,sigmas:n}}function Zg(r,t,n){const s=new Ns(r,t,n);return s.texture.mapping=ru,s.texture.name="PMREM.cubeUv",s.scissorTest=!0,s}function Rr(r,t,n,s,l){r.viewport.set(t,n,s,l),r.scissor.set(t,n,s,l)}function ME(r,t,n){return new ya({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:vE,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:fu(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 3.2: Transform view direction to hemisphere configuration
				vec3 Vh = normalize(vec3(alpha * V.x, alpha * V.y, V.z));

				// Section 4.1: Orthonormal basis
				float lensq = Vh.x * Vh.x + Vh.y * Vh.y;
				vec3 T1 = lensq > 0.0 ? vec3(-Vh.y, Vh.x, 0.0) / sqrt(lensq) : vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(Vh, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + Vh.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * Vh;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:_a,depthTest:!1,depthWrite:!1})}function bE(r,t,n){const s=new Float32Array(Ds),l=new Y(0,1,0);return new ya({name:"SphericalGaussianBlur",defines:{n:Ds,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:s},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:l}},vertexShader:fu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:_a,depthTest:!1,depthWrite:!1})}function Kg(){return new ya({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:fu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:_a,depthTest:!1,depthWrite:!1})}function Qg(){return new ya({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:fu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:_a,depthTest:!1,depthWrite:!1})}function fu(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function EE(r){let t=new WeakMap,n=null;function s(d){if(d&&d.isTexture){const m=d.mapping,p=m===gd||m===_d,x=m===Or||m===Pr;if(p||x){let g=t.get(d);const _=g!==void 0?g.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==_)return n===null&&(n=new jg(r)),g=p?n.fromEquirectangular(d,g):n.fromCubemap(d,g),g.texture.pmremVersion=d.pmremVersion,t.set(d,g),g.texture;if(g!==void 0)return g.texture;{const S=d.image;return p&&S&&S.height>0||x&&S&&l(S)?(n===null&&(n=new jg(r)),g=p?n.fromEquirectangular(d):n.fromCubemap(d),g.texture.pmremVersion=d.pmremVersion,t.set(d,g),d.addEventListener("dispose",c),g.texture):null}}}return d}function l(d){let m=0;const p=6;for(let x=0;x<p;x++)d[x]!==void 0&&m++;return m===p}function c(d){const m=d.target;m.removeEventListener("dispose",c);const p=t.get(m);p!==void 0&&(t.delete(m),p.dispose())}function f(){t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:f}}function TE(r){const t={};function n(s){if(t[s]!==void 0)return t[s];const l=r.getExtension(s);return t[s]=l,l}return{has:function(s){return n(s)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(s){const l=n(s);return l===null&&nl("WebGLRenderer: "+s+" extension not supported."),l}}}function AE(r,t,n,s){const l={},c=new WeakMap;function f(g){const _=g.target;_.index!==null&&t.remove(_.index);for(const b in _.attributes)t.remove(_.attributes[b]);_.removeEventListener("dispose",f),delete l[_.id];const S=c.get(_);S&&(t.remove(S),c.delete(_)),s.releaseStatesOfGeometry(_),_.isInstancedBufferGeometry===!0&&delete _._maxInstanceCount,n.memory.geometries--}function d(g,_){return l[_.id]===!0||(_.addEventListener("dispose",f),l[_.id]=!0,n.memory.geometries++),_}function m(g){const _=g.attributes;for(const S in _)t.update(_[S],r.ARRAY_BUFFER)}function p(g){const _=[],S=g.index,b=g.attributes.position;let A=0;if(S!==null){const z=S.array;A=S.version;for(let w=0,O=z.length;w<O;w+=3){const k=z[w+0],P=z[w+1],F=z[w+2];_.push(k,P,P,F,F,k)}}else if(b!==void 0){const z=b.array;A=b.version;for(let w=0,O=z.length/3-1;w<O;w+=3){const k=w+0,P=w+1,F=w+2;_.push(k,P,P,F,F,k)}}else return;const M=new(D_(_)?z_:P_)(_,1);M.version=A;const y=c.get(g);y&&t.remove(y),c.set(g,M)}function x(g){const _=c.get(g);if(_){const S=g.index;S!==null&&_.version<S.version&&p(g)}else p(g);return c.get(g)}return{get:d,update:m,getWireframeAttribute:x}}function RE(r,t,n){let s;function l(_){s=_}let c,f;function d(_){c=_.type,f=_.bytesPerElement}function m(_,S){r.drawElements(s,S,c,_*f),n.update(S,s,1)}function p(_,S,b){b!==0&&(r.drawElementsInstanced(s,S,c,_*f,b),n.update(S,s,b))}function x(_,S,b){if(b===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(s,S,0,c,_,0,b);let M=0;for(let y=0;y<b;y++)M+=S[y];n.update(M,s,1)}function g(_,S,b,A){if(b===0)return;const M=t.get("WEBGL_multi_draw");if(M===null)for(let y=0;y<_.length;y++)p(_[y]/f,S[y],A[y]);else{M.multiDrawElementsInstancedWEBGL(s,S,0,c,_,0,A,0,b);let y=0;for(let z=0;z<b;z++)y+=S[z]*A[z];n.update(y,s,1)}}this.setMode=l,this.setIndex=d,this.render=m,this.renderInstances=p,this.renderMultiDraw=x,this.renderMultiDrawInstances=g}function CE(r){const t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function s(c,f,d){switch(n.calls++,f){case r.TRIANGLES:n.triangles+=d*(c/3);break;case r.LINES:n.lines+=d*(c/2);break;case r.LINE_STRIP:n.lines+=d*(c-1);break;case r.LINE_LOOP:n.lines+=d*c;break;case r.POINTS:n.points+=d*c;break;default:an("WebGLInfo: Unknown draw mode:",f);break}}function l(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:l,update:s}}function wE(r,t,n){const s=new WeakMap,l=new sn;function c(f,d,m){const p=f.morphTargetInfluences,x=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,g=x!==void 0?x.length:0;let _=s.get(d);if(_===void 0||_.count!==g){let C=function(){Q.dispose(),s.delete(d),d.removeEventListener("dispose",C)};var S=C;_!==void 0&&_.texture.dispose();const b=d.morphAttributes.position!==void 0,A=d.morphAttributes.normal!==void 0,M=d.morphAttributes.color!==void 0,y=d.morphAttributes.position||[],z=d.morphAttributes.normal||[],w=d.morphAttributes.color||[];let O=0;b===!0&&(O=1),A===!0&&(O=2),M===!0&&(O=3);let k=d.attributes.position.count*O,P=1;k>t.maxTextureSize&&(P=Math.ceil(k/t.maxTextureSize),k=t.maxTextureSize);const F=new Float32Array(k*P*4*g),Q=new U_(F,k,P,g);Q.type=ga,Q.needsUpdate=!0;const D=O*4;for(let H=0;H<g;H++){const nt=y[H],ct=z[H],pt=w[H],lt=k*P*4*H;for(let B=0;B<nt.count;B++){const q=B*D;b===!0&&(l.fromBufferAttribute(nt,B),F[lt+q+0]=l.x,F[lt+q+1]=l.y,F[lt+q+2]=l.z,F[lt+q+3]=0),A===!0&&(l.fromBufferAttribute(ct,B),F[lt+q+4]=l.x,F[lt+q+5]=l.y,F[lt+q+6]=l.z,F[lt+q+7]=0),M===!0&&(l.fromBufferAttribute(pt,B),F[lt+q+8]=l.x,F[lt+q+9]=l.y,F[lt+q+10]=l.z,F[lt+q+11]=pt.itemSize===4?l.w:1)}}_={count:g,texture:Q,size:new Nt(k,P)},s.set(d,_),d.addEventListener("dispose",C)}if(f.isInstancedMesh===!0&&f.morphTexture!==null)m.getUniforms().setValue(r,"morphTexture",f.morphTexture,n);else{let b=0;for(let M=0;M<p.length;M++)b+=p[M];const A=d.morphTargetsRelative?1:1-b;m.getUniforms().setValue(r,"morphTargetBaseInfluence",A),m.getUniforms().setValue(r,"morphTargetInfluences",p)}m.getUniforms().setValue(r,"morphTargetsTexture",_.texture,n),m.getUniforms().setValue(r,"morphTargetsTextureSize",_.size)}return{update:c}}function DE(r,t,n,s){let l=new WeakMap;function c(m){const p=s.render.frame,x=m.geometry,g=t.get(m,x);if(l.get(g)!==p&&(t.update(g),l.set(g,p)),m.isInstancedMesh&&(m.hasEventListener("dispose",d)===!1&&m.addEventListener("dispose",d),l.get(m)!==p&&(n.update(m.instanceMatrix,r.ARRAY_BUFFER),m.instanceColor!==null&&n.update(m.instanceColor,r.ARRAY_BUFFER),l.set(m,p))),m.isSkinnedMesh){const _=m.skeleton;l.get(_)!==p&&(_.update(),l.set(_,p))}return g}function f(){l=new WeakMap}function d(m){const p=m.target;p.removeEventListener("dispose",d),n.remove(p.instanceMatrix),p.instanceColor!==null&&n.remove(p.instanceColor)}return{update:c,dispose:f}}const tv=new In,Jg=new H_(1,1),ev=new U_,nv=new xM,iv=new I_,$g=[],t_=[],e_=new Float32Array(16),n_=new Float32Array(9),i_=new Float32Array(4);function kr(r,t,n){const s=r[0];if(s<=0||s>0)return r;const l=t*n;let c=$g[l];if(c===void 0&&(c=new Float32Array(l),$g[l]=c),t!==0){s.toArray(c,0);for(let f=1,d=0;f!==t;++f)d+=n,r[f].toArray(c,d)}return c}function _n(r,t){if(r.length!==t.length)return!1;for(let n=0,s=r.length;n<s;n++)if(r[n]!==t[n])return!1;return!0}function vn(r,t){for(let n=0,s=t.length;n<s;n++)r[n]=t[n]}function hu(r,t){let n=t_[t];n===void 0&&(n=new Int32Array(t),t_[t]=n);for(let s=0;s!==t;++s)n[s]=r.allocateTextureUnit();return n}function UE(r,t){const n=this.cache;n[0]!==t&&(r.uniform1f(this.addr,t),n[0]=t)}function LE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(r.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(_n(n,t))return;r.uniform2fv(this.addr,t),vn(n,t)}}function NE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(r.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(r.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(_n(n,t))return;r.uniform3fv(this.addr,t),vn(n,t)}}function OE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(r.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(_n(n,t))return;r.uniform4fv(this.addr,t),vn(n,t)}}function PE(r,t){const n=this.cache,s=t.elements;if(s===void 0){if(_n(n,t))return;r.uniformMatrix2fv(this.addr,!1,t),vn(n,t)}else{if(_n(n,s))return;i_.set(s),r.uniformMatrix2fv(this.addr,!1,i_),vn(n,s)}}function zE(r,t){const n=this.cache,s=t.elements;if(s===void 0){if(_n(n,t))return;r.uniformMatrix3fv(this.addr,!1,t),vn(n,t)}else{if(_n(n,s))return;n_.set(s),r.uniformMatrix3fv(this.addr,!1,n_),vn(n,s)}}function BE(r,t){const n=this.cache,s=t.elements;if(s===void 0){if(_n(n,t))return;r.uniformMatrix4fv(this.addr,!1,t),vn(n,t)}else{if(_n(n,s))return;e_.set(s),r.uniformMatrix4fv(this.addr,!1,e_),vn(n,s)}}function FE(r,t){const n=this.cache;n[0]!==t&&(r.uniform1i(this.addr,t),n[0]=t)}function IE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(r.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(_n(n,t))return;r.uniform2iv(this.addr,t),vn(n,t)}}function HE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(r.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(_n(n,t))return;r.uniform3iv(this.addr,t),vn(n,t)}}function GE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(r.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(_n(n,t))return;r.uniform4iv(this.addr,t),vn(n,t)}}function VE(r,t){const n=this.cache;n[0]!==t&&(r.uniform1ui(this.addr,t),n[0]=t)}function kE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(r.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(_n(n,t))return;r.uniform2uiv(this.addr,t),vn(n,t)}}function XE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(r.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(_n(n,t))return;r.uniform3uiv(this.addr,t),vn(n,t)}}function WE(r,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(r.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(_n(n,t))return;r.uniform4uiv(this.addr,t),vn(n,t)}}function qE(r,t,n){const s=this.cache,l=n.allocateTextureUnit();s[0]!==l&&(r.uniform1i(this.addr,l),s[0]=l);let c;this.type===r.SAMPLER_2D_SHADOW?(Jg.compareFunction=w_,c=Jg):c=tv,n.setTexture2D(t||c,l)}function YE(r,t,n){const s=this.cache,l=n.allocateTextureUnit();s[0]!==l&&(r.uniform1i(this.addr,l),s[0]=l),n.setTexture3D(t||nv,l)}function jE(r,t,n){const s=this.cache,l=n.allocateTextureUnit();s[0]!==l&&(r.uniform1i(this.addr,l),s[0]=l),n.setTextureCube(t||iv,l)}function ZE(r,t,n){const s=this.cache,l=n.allocateTextureUnit();s[0]!==l&&(r.uniform1i(this.addr,l),s[0]=l),n.setTexture2DArray(t||ev,l)}function KE(r){switch(r){case 5126:return UE;case 35664:return LE;case 35665:return NE;case 35666:return OE;case 35674:return PE;case 35675:return zE;case 35676:return BE;case 5124:case 35670:return FE;case 35667:case 35671:return IE;case 35668:case 35672:return HE;case 35669:case 35673:return GE;case 5125:return VE;case 36294:return kE;case 36295:return XE;case 36296:return WE;case 35678:case 36198:case 36298:case 36306:case 35682:return qE;case 35679:case 36299:case 36307:return YE;case 35680:case 36300:case 36308:case 36293:return jE;case 36289:case 36303:case 36311:case 36292:return ZE}}function QE(r,t){r.uniform1fv(this.addr,t)}function JE(r,t){const n=kr(t,this.size,2);r.uniform2fv(this.addr,n)}function $E(r,t){const n=kr(t,this.size,3);r.uniform3fv(this.addr,n)}function tT(r,t){const n=kr(t,this.size,4);r.uniform4fv(this.addr,n)}function eT(r,t){const n=kr(t,this.size,4);r.uniformMatrix2fv(this.addr,!1,n)}function nT(r,t){const n=kr(t,this.size,9);r.uniformMatrix3fv(this.addr,!1,n)}function iT(r,t){const n=kr(t,this.size,16);r.uniformMatrix4fv(this.addr,!1,n)}function aT(r,t){r.uniform1iv(this.addr,t)}function sT(r,t){r.uniform2iv(this.addr,t)}function rT(r,t){r.uniform3iv(this.addr,t)}function oT(r,t){r.uniform4iv(this.addr,t)}function lT(r,t){r.uniform1uiv(this.addr,t)}function cT(r,t){r.uniform2uiv(this.addr,t)}function uT(r,t){r.uniform3uiv(this.addr,t)}function fT(r,t){r.uniform4uiv(this.addr,t)}function hT(r,t,n){const s=this.cache,l=t.length,c=hu(n,l);_n(s,c)||(r.uniform1iv(this.addr,c),vn(s,c));for(let f=0;f!==l;++f)n.setTexture2D(t[f]||tv,c[f])}function dT(r,t,n){const s=this.cache,l=t.length,c=hu(n,l);_n(s,c)||(r.uniform1iv(this.addr,c),vn(s,c));for(let f=0;f!==l;++f)n.setTexture3D(t[f]||nv,c[f])}function pT(r,t,n){const s=this.cache,l=t.length,c=hu(n,l);_n(s,c)||(r.uniform1iv(this.addr,c),vn(s,c));for(let f=0;f!==l;++f)n.setTextureCube(t[f]||iv,c[f])}function mT(r,t,n){const s=this.cache,l=t.length,c=hu(n,l);_n(s,c)||(r.uniform1iv(this.addr,c),vn(s,c));for(let f=0;f!==l;++f)n.setTexture2DArray(t[f]||ev,c[f])}function xT(r){switch(r){case 5126:return QE;case 35664:return JE;case 35665:return $E;case 35666:return tT;case 35674:return eT;case 35675:return nT;case 35676:return iT;case 5124:case 35670:return aT;case 35667:case 35671:return sT;case 35668:case 35672:return rT;case 35669:case 35673:return oT;case 5125:return lT;case 36294:return cT;case 36295:return uT;case 36296:return fT;case 35678:case 36198:case 36298:case 36306:case 35682:return hT;case 35679:case 36299:case 36307:return dT;case 35680:case 36300:case 36308:case 36293:return pT;case 36289:case 36303:case 36311:case 36292:return mT}}class gT{constructor(t,n,s){this.id=t,this.addr=s,this.cache=[],this.type=n.type,this.setValue=KE(n.type)}}class _T{constructor(t,n,s){this.id=t,this.addr=s,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=xT(n.type)}}class vT{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,n,s){const l=this.seq;for(let c=0,f=l.length;c!==f;++c){const d=l[c];d.setValue(t,n[d.id],s)}}}const rd=/(\w+)(\])?(\[|\.)?/g;function a_(r,t){r.seq.push(t),r.map[t.id]=t}function yT(r,t,n){const s=r.name,l=s.length;for(rd.lastIndex=0;;){const c=rd.exec(s),f=rd.lastIndex;let d=c[1];const m=c[2]==="]",p=c[3];if(m&&(d=d|0),p===void 0||p==="["&&f+2===l){a_(n,p===void 0?new gT(d,r,t):new _T(d,r,t));break}else{let g=n.map[d];g===void 0&&(g=new vT(d),a_(n,g)),n=g}}}class Jc{constructor(t,n){this.seq=[],this.map={};const s=t.getProgramParameter(n,t.ACTIVE_UNIFORMS);for(let l=0;l<s;++l){const c=t.getActiveUniform(n,l),f=t.getUniformLocation(n,c.name);yT(c,f,this)}}setValue(t,n,s,l){const c=this.map[n];c!==void 0&&c.setValue(t,s,l)}setOptional(t,n,s){const l=n[s];l!==void 0&&this.setValue(t,s,l)}static upload(t,n,s,l){for(let c=0,f=n.length;c!==f;++c){const d=n[c],m=s[d.id];m.needsUpdate!==!1&&d.setValue(t,m.value,l)}}static seqWithValue(t,n){const s=[];for(let l=0,c=t.length;l!==c;++l){const f=t[l];f.id in n&&s.push(f)}return s}}function s_(r,t,n){const s=r.createShader(t);return r.shaderSource(s,n),r.compileShader(s),s}const ST=37297;let MT=0;function bT(r,t){const n=r.split(`
`),s=[],l=Math.max(t-6,0),c=Math.min(t+6,n.length);for(let f=l;f<c;f++){const d=f+1;s.push(`${d===t?">":" "} ${d}: ${n[f]}`)}return s.join(`
`)}const r_=new _e;function ET(r){Oe._getMatrix(r_,Oe.workingColorSpace,r);const t=`mat3( ${r_.elements.map(n=>n.toFixed(4))} )`;switch(Oe.getTransfer(r)){case tu:return[t,"LinearTransferOETF"];case Xe:return[t,"sRGBTransferOETF"];default:return fe("WebGLProgram: Unsupported color space: ",r),[t,"LinearTransferOETF"]}}function o_(r,t,n){const s=r.getShaderParameter(t,r.COMPILE_STATUS),c=(r.getShaderInfoLog(t)||"").trim();if(s&&c==="")return"";const f=/ERROR: 0:(\d+)/.exec(c);if(f){const d=parseInt(f[1]);return n.toUpperCase()+`

`+c+`

`+bT(r.getShaderSource(t),d)}else return c}function TT(r,t){const n=ET(t);return[`vec4 ${r}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}function AT(r,t){let n;switch(t){case kS:n="Linear";break;case XS:n="Reinhard";break;case WS:n="Cineon";break;case qS:n="ACESFilmic";break;case jS:n="AgX";break;case ZS:n="Neutral";break;case YS:n="Custom";break;default:fe("WebGLProgram: Unsupported toneMapping:",t),n="Linear"}return"vec3 "+r+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}const Wc=new Y;function RT(){Oe.getLuminanceCoefficients(Wc);const r=Wc.x.toFixed(4),t=Wc.y.toFixed(4),n=Wc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${r}, ${t}, ${n} );`,"	return dot( weights, rgb );","}"].join(`
`)}function CT(r){return[r.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",r.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(jo).join(`
`)}function wT(r){const t=[];for(const n in r){const s=r[n];s!==!1&&t.push("#define "+n+" "+s)}return t.join(`
`)}function DT(r,t){const n={},s=r.getProgramParameter(t,r.ACTIVE_ATTRIBUTES);for(let l=0;l<s;l++){const c=r.getActiveAttrib(t,l),f=c.name;let d=1;c.type===r.FLOAT_MAT2&&(d=2),c.type===r.FLOAT_MAT3&&(d=3),c.type===r.FLOAT_MAT4&&(d=4),n[f]={type:c.type,location:r.getAttribLocation(t,f),locationSize:d}}return n}function jo(r){return r!==""}function l_(r,t){const n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return r.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function c_(r,t){return r.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const UT=/^[ \t]*#include +<([\w\d./]+)>/gm;function $d(r){return r.replace(UT,NT)}const LT=new Map;function NT(r,t){let n=ve[t];if(n===void 0){const s=LT.get(t);if(s!==void 0)n=ve[s],fe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,s);else throw new Error("Can not resolve #include <"+t+">")}return $d(n)}const OT=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function u_(r){return r.replace(OT,PT)}function PT(r,t,n,s){let l="";for(let c=parseInt(t);c<parseInt(n);c++)l+=s.replace(/\[\s*i\s*\]/g,"[ "+c+" ]").replace(/UNROLLED_LOOP_INDEX/g,c);return l}function f_(r){let t=`precision ${r.precision} float;
	precision ${r.precision} int;
	precision ${r.precision} sampler2D;
	precision ${r.precision} samplerCube;
	precision ${r.precision} sampler3D;
	precision ${r.precision} sampler2DArray;
	precision ${r.precision} sampler2DShadow;
	precision ${r.precision} samplerCubeShadow;
	precision ${r.precision} sampler2DArrayShadow;
	precision ${r.precision} isampler2D;
	precision ${r.precision} isampler3D;
	precision ${r.precision} isamplerCube;
	precision ${r.precision} isampler2DArray;
	precision ${r.precision} usampler2D;
	precision ${r.precision} usampler3D;
	precision ${r.precision} usamplerCube;
	precision ${r.precision} usampler2DArray;
	`;return r.precision==="highp"?t+=`
#define HIGH_PRECISION`:r.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:r.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function zT(r){let t="SHADOWMAP_TYPE_BASIC";return r.shadowMapType===__?t="SHADOWMAP_TYPE_PCF":r.shadowMapType===MS?t="SHADOWMAP_TYPE_PCF_SOFT":r.shadowMapType===pa&&(t="SHADOWMAP_TYPE_VSM"),t}function BT(r){let t="ENVMAP_TYPE_CUBE";if(r.envMap)switch(r.envMapMode){case Or:case Pr:t="ENVMAP_TYPE_CUBE";break;case ru:t="ENVMAP_TYPE_CUBE_UV";break}return t}function FT(r){let t="ENVMAP_MODE_REFLECTION";return r.envMap&&r.envMapMode===Pr&&(t="ENVMAP_MODE_REFRACTION"),t}function IT(r){let t="ENVMAP_BLENDING_NONE";if(r.envMap)switch(r.combine){case v_:t="ENVMAP_BLENDING_MULTIPLY";break;case GS:t="ENVMAP_BLENDING_MIX";break;case VS:t="ENVMAP_BLENDING_ADD";break}return t}function HT(r){const t=r.envMapCubeUVHeight;if(t===null)return null;const n=Math.log2(t)-2,s=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:s,maxMip:n}}function GT(r,t,n,s){const l=r.getContext(),c=n.defines;let f=n.vertexShader,d=n.fragmentShader;const m=zT(n),p=BT(n),x=FT(n),g=IT(n),_=HT(n),S=CT(n),b=wT(c),A=l.createProgram();let M,y,z=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(M=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,b].filter(jo).join(`
`),M.length>0&&(M+=`
`),y=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,b].filter(jo).join(`
`),y.length>0&&(y+=`
`)):(M=[f_(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,b,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+x:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+m:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(jo).join(`
`),y=[f_(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,b,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+p:"",n.envMap?"#define "+x:"",n.envMap?"#define "+g:"",_?"#define CUBEUV_TEXEL_WIDTH "+_.texelWidth:"",_?"#define CUBEUV_TEXEL_HEIGHT "+_.texelHeight:"",_?"#define CUBEUV_MAX_MIP "+_.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor||n.batchingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+m:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==es?"#define TONE_MAPPING":"",n.toneMapping!==es?ve.tonemapping_pars_fragment:"",n.toneMapping!==es?AT("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",ve.colorspace_pars_fragment,TT("linearToOutputTexel",n.outputColorSpace),RT(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(jo).join(`
`)),f=$d(f),f=l_(f,n),f=c_(f,n),d=$d(d),d=l_(d,n),d=c_(d,n),f=u_(f),d=u_(d),n.isRawShaderMaterial!==!0&&(z=`#version 300 es
`,M=[S,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+M,y=["#define varying in",n.glslVersion===dg?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===dg?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+y);const w=z+M+f,O=z+y+d,k=s_(l,l.VERTEX_SHADER,w),P=s_(l,l.FRAGMENT_SHADER,O);l.attachShader(A,k),l.attachShader(A,P),n.index0AttributeName!==void 0?l.bindAttribLocation(A,0,n.index0AttributeName):n.morphTargets===!0&&l.bindAttribLocation(A,0,"position"),l.linkProgram(A);function F(H){if(r.debug.checkShaderErrors){const nt=l.getProgramInfoLog(A)||"",ct=l.getShaderInfoLog(k)||"",pt=l.getShaderInfoLog(P)||"",lt=nt.trim(),B=ct.trim(),q=pt.trim();let j=!0,xt=!0;if(l.getProgramParameter(A,l.LINK_STATUS)===!1)if(j=!1,typeof r.debug.onShaderError=="function")r.debug.onShaderError(l,A,k,P);else{const vt=o_(l,k,"vertex"),N=o_(l,P,"fragment");an("THREE.WebGLProgram: Shader Error "+l.getError()+" - VALIDATE_STATUS "+l.getProgramParameter(A,l.VALIDATE_STATUS)+`

Material Name: `+H.name+`
Material Type: `+H.type+`

Program Info Log: `+lt+`
`+vt+`
`+N)}else lt!==""?fe("WebGLProgram: Program Info Log:",lt):(B===""||q==="")&&(xt=!1);xt&&(H.diagnostics={runnable:j,programLog:lt,vertexShader:{log:B,prefix:M},fragmentShader:{log:q,prefix:y}})}l.deleteShader(k),l.deleteShader(P),Q=new Jc(l,A),D=DT(l,A)}let Q;this.getUniforms=function(){return Q===void 0&&F(this),Q};let D;this.getAttributes=function(){return D===void 0&&F(this),D};let C=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=l.getProgramParameter(A,ST)),C},this.destroy=function(){s.releaseStatesOfProgram(this),l.deleteProgram(A),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=MT++,this.cacheKey=t,this.usedTimes=1,this.program=A,this.vertexShader=k,this.fragmentShader=P,this}let VT=0;class kT{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const n=t.vertexShader,s=t.fragmentShader,l=this._getShaderStage(n),c=this._getShaderStage(s),f=this._getShaderCacheForMaterial(t);return f.has(l)===!1&&(f.add(l),l.usedTimes++),f.has(c)===!1&&(f.add(c),c.usedTimes++),this}remove(t){const n=this.materialCache.get(t);for(const s of n)s.usedTimes--,s.usedTimes===0&&this.shaderCache.delete(s.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const n=this.materialCache;let s=n.get(t);return s===void 0&&(s=new Set,n.set(t,s)),s}_getShaderStage(t){const n=this.shaderCache;let s=n.get(t);return s===void 0&&(s=new XT(t),n.set(t,s)),s}}class XT{constructor(t){this.id=VT++,this.code=t,this.usedTimes=0}}function WT(r,t,n,s,l,c,f){const d=new L_,m=new kT,p=new Set,x=[],g=l.logarithmicDepthBuffer,_=l.vertexTextures;let S=l.precision;const b={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function A(D){return p.add(D),D===0?"uv":`uv${D}`}function M(D,C,H,nt,ct){const pt=nt.fog,lt=ct.geometry,B=D.isMeshStandardMaterial?nt.environment:null,q=(D.isMeshStandardMaterial?n:t).get(D.envMap||B),j=q&&q.mapping===ru?q.image.height:null,xt=b[D.type];D.precision!==null&&(S=l.getMaxPrecision(D.precision),S!==D.precision&&fe("WebGLProgram.getParameters:",D.precision,"not supported, using",S,"instead."));const vt=lt.morphAttributes.position||lt.morphAttributes.normal||lt.morphAttributes.color,N=vt!==void 0?vt.length:0;let it=0;lt.morphAttributes.position!==void 0&&(it=1),lt.morphAttributes.normal!==void 0&&(it=2),lt.morphAttributes.color!==void 0&&(it=3);let _t,Rt,Gt,at;if(xt){const De=Pi[xt];_t=De.vertexShader,Rt=De.fragmentShader}else _t=D.vertexShader,Rt=D.fragmentShader,m.update(D),Gt=m.getVertexShaderID(D),at=m.getFragmentShaderID(D);const ut=r.getRenderTarget(),Ot=r.state.buffers.depth.getReversed(),Ht=ct.isInstancedMesh===!0,Zt=ct.isBatchedMesh===!0,pe=!!D.map,Pe=!!D.matcap,oe=!!q,yt=!!D.aoMap,L=!!D.lightMap,bt=!!D.bumpMap,Ct=!!D.normalMap,Dt=!!D.displacementMap,Tt=!!D.emissiveMap,Wt=!!D.metalnessMap,Pt=!!D.roughnessMap,kt=D.anisotropy>0,U=D.clearcoat>0,E=D.dispersion>0,K=D.iridescence>0,ft=D.sheen>0,St=D.transmission>0,ot=kt&&!!D.anisotropyMap,$t=U&&!!D.clearcoatMap,zt=U&&!!D.clearcoatNormalMap,ee=U&&!!D.clearcoatRoughnessMap,Qt=K&&!!D.iridescenceMap,Mt=K&&!!D.iridescenceThicknessMap,At=ft&&!!D.sheenColorMap,te=ft&&!!D.sheenRoughnessMap,Kt=!!D.specularMap,Vt=!!D.specularColorMap,ce=!!D.specularIntensityMap,G=St&&!!D.transmissionMap,Bt=St&&!!D.thicknessMap,Ut=!!D.gradientMap,Lt=!!D.alphaMap,Et=D.alphaTest>0,gt=!!D.alphaHash,qt=!!D.extensions;let ue=es;D.toneMapped&&(ut===null||ut.isXRRenderTarget===!0)&&(ue=r.toneMapping);const He={shaderID:xt,shaderType:D.type,shaderName:D.name,vertexShader:_t,fragmentShader:Rt,defines:D.defines,customVertexShaderID:Gt,customFragmentShaderID:at,isRawShaderMaterial:D.isRawShaderMaterial===!0,glslVersion:D.glslVersion,precision:S,batching:Zt,batchingColor:Zt&&ct._colorsTexture!==null,instancing:Ht,instancingColor:Ht&&ct.instanceColor!==null,instancingMorph:Ht&&ct.morphTexture!==null,supportsVertexTextures:_,outputColorSpace:ut===null?r.outputColorSpace:ut.isXRRenderTarget===!0?ut.texture.colorSpace:zr,alphaToCoverage:!!D.alphaToCoverage,map:pe,matcap:Pe,envMap:oe,envMapMode:oe&&q.mapping,envMapCubeUVHeight:j,aoMap:yt,lightMap:L,bumpMap:bt,normalMap:Ct,displacementMap:_&&Dt,emissiveMap:Tt,normalMapObjectSpace:Ct&&D.normalMapType===$S,normalMapTangentSpace:Ct&&D.normalMapType===C_,metalnessMap:Wt,roughnessMap:Pt,anisotropy:kt,anisotropyMap:ot,clearcoat:U,clearcoatMap:$t,clearcoatNormalMap:zt,clearcoatRoughnessMap:ee,dispersion:E,iridescence:K,iridescenceMap:Qt,iridescenceThicknessMap:Mt,sheen:ft,sheenColorMap:At,sheenRoughnessMap:te,specularMap:Kt,specularColorMap:Vt,specularIntensityMap:ce,transmission:St,transmissionMap:G,thicknessMap:Bt,gradientMap:Ut,opaque:D.transparent===!1&&D.blending===Ur&&D.alphaToCoverage===!1,alphaMap:Lt,alphaTest:Et,alphaHash:gt,combine:D.combine,mapUv:pe&&A(D.map.channel),aoMapUv:yt&&A(D.aoMap.channel),lightMapUv:L&&A(D.lightMap.channel),bumpMapUv:bt&&A(D.bumpMap.channel),normalMapUv:Ct&&A(D.normalMap.channel),displacementMapUv:Dt&&A(D.displacementMap.channel),emissiveMapUv:Tt&&A(D.emissiveMap.channel),metalnessMapUv:Wt&&A(D.metalnessMap.channel),roughnessMapUv:Pt&&A(D.roughnessMap.channel),anisotropyMapUv:ot&&A(D.anisotropyMap.channel),clearcoatMapUv:$t&&A(D.clearcoatMap.channel),clearcoatNormalMapUv:zt&&A(D.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ee&&A(D.clearcoatRoughnessMap.channel),iridescenceMapUv:Qt&&A(D.iridescenceMap.channel),iridescenceThicknessMapUv:Mt&&A(D.iridescenceThicknessMap.channel),sheenColorMapUv:At&&A(D.sheenColorMap.channel),sheenRoughnessMapUv:te&&A(D.sheenRoughnessMap.channel),specularMapUv:Kt&&A(D.specularMap.channel),specularColorMapUv:Vt&&A(D.specularColorMap.channel),specularIntensityMapUv:ce&&A(D.specularIntensityMap.channel),transmissionMapUv:G&&A(D.transmissionMap.channel),thicknessMapUv:Bt&&A(D.thicknessMap.channel),alphaMapUv:Lt&&A(D.alphaMap.channel),vertexTangents:!!lt.attributes.tangent&&(Ct||kt),vertexColors:D.vertexColors,vertexAlphas:D.vertexColors===!0&&!!lt.attributes.color&&lt.attributes.color.itemSize===4,pointsUvs:ct.isPoints===!0&&!!lt.attributes.uv&&(pe||Lt),fog:!!pt,useFog:D.fog===!0,fogExp2:!!pt&&pt.isFogExp2,flatShading:D.flatShading===!0&&D.wireframe===!1,sizeAttenuation:D.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:Ot,skinning:ct.isSkinnedMesh===!0,morphTargets:lt.morphAttributes.position!==void 0,morphNormals:lt.morphAttributes.normal!==void 0,morphColors:lt.morphAttributes.color!==void 0,morphTargetsCount:N,morphTextureStride:it,numDirLights:C.directional.length,numPointLights:C.point.length,numSpotLights:C.spot.length,numSpotLightMaps:C.spotLightMap.length,numRectAreaLights:C.rectArea.length,numHemiLights:C.hemi.length,numDirLightShadows:C.directionalShadowMap.length,numPointLightShadows:C.pointShadowMap.length,numSpotLightShadows:C.spotShadowMap.length,numSpotLightShadowsWithMaps:C.numSpotLightShadowsWithMaps,numLightProbes:C.numLightProbes,numClippingPlanes:f.numPlanes,numClipIntersection:f.numIntersection,dithering:D.dithering,shadowMapEnabled:r.shadowMap.enabled&&H.length>0,shadowMapType:r.shadowMap.type,toneMapping:ue,decodeVideoTexture:pe&&D.map.isVideoTexture===!0&&Oe.getTransfer(D.map.colorSpace)===Xe,decodeVideoTextureEmissive:Tt&&D.emissiveMap.isVideoTexture===!0&&Oe.getTransfer(D.emissiveMap.colorSpace)===Xe,premultipliedAlpha:D.premultipliedAlpha,doubleSided:D.side===ma,flipSided:D.side===jn,useDepthPacking:D.depthPacking>=0,depthPacking:D.depthPacking||0,index0AttributeName:D.index0AttributeName,extensionClipCullDistance:qt&&D.extensions.clipCullDistance===!0&&s.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(qt&&D.extensions.multiDraw===!0||Zt)&&s.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:s.has("KHR_parallel_shader_compile"),customProgramCacheKey:D.customProgramCacheKey()};return He.vertexUv1s=p.has(1),He.vertexUv2s=p.has(2),He.vertexUv3s=p.has(3),p.clear(),He}function y(D){const C=[];if(D.shaderID?C.push(D.shaderID):(C.push(D.customVertexShaderID),C.push(D.customFragmentShaderID)),D.defines!==void 0)for(const H in D.defines)C.push(H),C.push(D.defines[H]);return D.isRawShaderMaterial===!1&&(z(C,D),w(C,D),C.push(r.outputColorSpace)),C.push(D.customProgramCacheKey),C.join()}function z(D,C){D.push(C.precision),D.push(C.outputColorSpace),D.push(C.envMapMode),D.push(C.envMapCubeUVHeight),D.push(C.mapUv),D.push(C.alphaMapUv),D.push(C.lightMapUv),D.push(C.aoMapUv),D.push(C.bumpMapUv),D.push(C.normalMapUv),D.push(C.displacementMapUv),D.push(C.emissiveMapUv),D.push(C.metalnessMapUv),D.push(C.roughnessMapUv),D.push(C.anisotropyMapUv),D.push(C.clearcoatMapUv),D.push(C.clearcoatNormalMapUv),D.push(C.clearcoatRoughnessMapUv),D.push(C.iridescenceMapUv),D.push(C.iridescenceThicknessMapUv),D.push(C.sheenColorMapUv),D.push(C.sheenRoughnessMapUv),D.push(C.specularMapUv),D.push(C.specularColorMapUv),D.push(C.specularIntensityMapUv),D.push(C.transmissionMapUv),D.push(C.thicknessMapUv),D.push(C.combine),D.push(C.fogExp2),D.push(C.sizeAttenuation),D.push(C.morphTargetsCount),D.push(C.morphAttributeCount),D.push(C.numDirLights),D.push(C.numPointLights),D.push(C.numSpotLights),D.push(C.numSpotLightMaps),D.push(C.numHemiLights),D.push(C.numRectAreaLights),D.push(C.numDirLightShadows),D.push(C.numPointLightShadows),D.push(C.numSpotLightShadows),D.push(C.numSpotLightShadowsWithMaps),D.push(C.numLightProbes),D.push(C.shadowMapType),D.push(C.toneMapping),D.push(C.numClippingPlanes),D.push(C.numClipIntersection),D.push(C.depthPacking)}function w(D,C){d.disableAll(),C.supportsVertexTextures&&d.enable(0),C.instancing&&d.enable(1),C.instancingColor&&d.enable(2),C.instancingMorph&&d.enable(3),C.matcap&&d.enable(4),C.envMap&&d.enable(5),C.normalMapObjectSpace&&d.enable(6),C.normalMapTangentSpace&&d.enable(7),C.clearcoat&&d.enable(8),C.iridescence&&d.enable(9),C.alphaTest&&d.enable(10),C.vertexColors&&d.enable(11),C.vertexAlphas&&d.enable(12),C.vertexUv1s&&d.enable(13),C.vertexUv2s&&d.enable(14),C.vertexUv3s&&d.enable(15),C.vertexTangents&&d.enable(16),C.anisotropy&&d.enable(17),C.alphaHash&&d.enable(18),C.batching&&d.enable(19),C.dispersion&&d.enable(20),C.batchingColor&&d.enable(21),C.gradientMap&&d.enable(22),D.push(d.mask),d.disableAll(),C.fog&&d.enable(0),C.useFog&&d.enable(1),C.flatShading&&d.enable(2),C.logarithmicDepthBuffer&&d.enable(3),C.reversedDepthBuffer&&d.enable(4),C.skinning&&d.enable(5),C.morphTargets&&d.enable(6),C.morphNormals&&d.enable(7),C.morphColors&&d.enable(8),C.premultipliedAlpha&&d.enable(9),C.shadowMapEnabled&&d.enable(10),C.doubleSided&&d.enable(11),C.flipSided&&d.enable(12),C.useDepthPacking&&d.enable(13),C.dithering&&d.enable(14),C.transmission&&d.enable(15),C.sheen&&d.enable(16),C.opaque&&d.enable(17),C.pointsUvs&&d.enable(18),C.decodeVideoTexture&&d.enable(19),C.decodeVideoTextureEmissive&&d.enable(20),C.alphaToCoverage&&d.enable(21),D.push(d.mask)}function O(D){const C=b[D.type];let H;if(C){const nt=Pi[C];H=wM.clone(nt.uniforms)}else H=D.uniforms;return H}function k(D,C){let H;for(let nt=0,ct=x.length;nt<ct;nt++){const pt=x[nt];if(pt.cacheKey===C){H=pt,++H.usedTimes;break}}return H===void 0&&(H=new GT(r,C,D,c),x.push(H)),H}function P(D){if(--D.usedTimes===0){const C=x.indexOf(D);x[C]=x[x.length-1],x.pop(),D.destroy()}}function F(D){m.remove(D)}function Q(){m.dispose()}return{getParameters:M,getProgramCacheKey:y,getUniforms:O,acquireProgram:k,releaseProgram:P,releaseShaderCache:F,programs:x,dispose:Q}}function qT(){let r=new WeakMap;function t(f){return r.has(f)}function n(f){let d=r.get(f);return d===void 0&&(d={},r.set(f,d)),d}function s(f){r.delete(f)}function l(f,d,m){r.get(f)[d]=m}function c(){r=new WeakMap}return{has:t,get:n,remove:s,update:l,dispose:c}}function YT(r,t){return r.groupOrder!==t.groupOrder?r.groupOrder-t.groupOrder:r.renderOrder!==t.renderOrder?r.renderOrder-t.renderOrder:r.material.id!==t.material.id?r.material.id-t.material.id:r.z!==t.z?r.z-t.z:r.id-t.id}function h_(r,t){return r.groupOrder!==t.groupOrder?r.groupOrder-t.groupOrder:r.renderOrder!==t.renderOrder?r.renderOrder-t.renderOrder:r.z!==t.z?t.z-r.z:r.id-t.id}function d_(){const r=[];let t=0;const n=[],s=[],l=[];function c(){t=0,n.length=0,s.length=0,l.length=0}function f(g,_,S,b,A,M){let y=r[t];return y===void 0?(y={id:g.id,object:g,geometry:_,material:S,groupOrder:b,renderOrder:g.renderOrder,z:A,group:M},r[t]=y):(y.id=g.id,y.object=g,y.geometry=_,y.material=S,y.groupOrder=b,y.renderOrder=g.renderOrder,y.z=A,y.group=M),t++,y}function d(g,_,S,b,A,M){const y=f(g,_,S,b,A,M);S.transmission>0?s.push(y):S.transparent===!0?l.push(y):n.push(y)}function m(g,_,S,b,A,M){const y=f(g,_,S,b,A,M);S.transmission>0?s.unshift(y):S.transparent===!0?l.unshift(y):n.unshift(y)}function p(g,_){n.length>1&&n.sort(g||YT),s.length>1&&s.sort(_||h_),l.length>1&&l.sort(_||h_)}function x(){for(let g=t,_=r.length;g<_;g++){const S=r[g];if(S.id===null)break;S.id=null,S.object=null,S.geometry=null,S.material=null,S.group=null}}return{opaque:n,transmissive:s,transparent:l,init:c,push:d,unshift:m,finish:x,sort:p}}function jT(){let r=new WeakMap;function t(s,l){const c=r.get(s);let f;return c===void 0?(f=new d_,r.set(s,[f])):l>=c.length?(f=new d_,c.push(f)):f=c[l],f}function n(){r=new WeakMap}return{get:t,dispose:n}}function ZT(){const r={};return{get:function(t){if(r[t.id]!==void 0)return r[t.id];let n;switch(t.type){case"DirectionalLight":n={direction:new Y,color:new Te};break;case"SpotLight":n={position:new Y,direction:new Y,color:new Te,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new Y,color:new Te,distance:0,decay:0};break;case"HemisphereLight":n={direction:new Y,skyColor:new Te,groundColor:new Te};break;case"RectAreaLight":n={color:new Te,position:new Y,halfWidth:new Y,halfHeight:new Y};break}return r[t.id]=n,n}}}function KT(){const r={};return{get:function(t){if(r[t.id]!==void 0)return r[t.id];let n;switch(t.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Nt};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Nt};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Nt,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[t.id]=n,n}}}let QT=0;function JT(r,t){return(t.castShadow?2:0)-(r.castShadow?2:0)+(t.map?1:0)-(r.map?1:0)}function $T(r){const t=new ZT,n=KT(),s={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let p=0;p<9;p++)s.probe.push(new Y);const l=new Y,c=new tn,f=new tn;function d(p){let x=0,g=0,_=0;for(let D=0;D<9;D++)s.probe[D].set(0,0,0);let S=0,b=0,A=0,M=0,y=0,z=0,w=0,O=0,k=0,P=0,F=0;p.sort(JT);for(let D=0,C=p.length;D<C;D++){const H=p[D],nt=H.color,ct=H.intensity,pt=H.distance,lt=H.shadow&&H.shadow.map?H.shadow.map.texture:null;if(H.isAmbientLight)x+=nt.r*ct,g+=nt.g*ct,_+=nt.b*ct;else if(H.isLightProbe){for(let B=0;B<9;B++)s.probe[B].addScaledVector(H.sh.coefficients[B],ct);F++}else if(H.isDirectionalLight){const B=t.get(H);if(B.color.copy(H.color).multiplyScalar(H.intensity),H.castShadow){const q=H.shadow,j=n.get(H);j.shadowIntensity=q.intensity,j.shadowBias=q.bias,j.shadowNormalBias=q.normalBias,j.shadowRadius=q.radius,j.shadowMapSize=q.mapSize,s.directionalShadow[S]=j,s.directionalShadowMap[S]=lt,s.directionalShadowMatrix[S]=H.shadow.matrix,z++}s.directional[S]=B,S++}else if(H.isSpotLight){const B=t.get(H);B.position.setFromMatrixPosition(H.matrixWorld),B.color.copy(nt).multiplyScalar(ct),B.distance=pt,B.coneCos=Math.cos(H.angle),B.penumbraCos=Math.cos(H.angle*(1-H.penumbra)),B.decay=H.decay,s.spot[A]=B;const q=H.shadow;if(H.map&&(s.spotLightMap[k]=H.map,k++,q.updateMatrices(H),H.castShadow&&P++),s.spotLightMatrix[A]=q.matrix,H.castShadow){const j=n.get(H);j.shadowIntensity=q.intensity,j.shadowBias=q.bias,j.shadowNormalBias=q.normalBias,j.shadowRadius=q.radius,j.shadowMapSize=q.mapSize,s.spotShadow[A]=j,s.spotShadowMap[A]=lt,O++}A++}else if(H.isRectAreaLight){const B=t.get(H);B.color.copy(nt).multiplyScalar(ct),B.halfWidth.set(H.width*.5,0,0),B.halfHeight.set(0,H.height*.5,0),s.rectArea[M]=B,M++}else if(H.isPointLight){const B=t.get(H);if(B.color.copy(H.color).multiplyScalar(H.intensity),B.distance=H.distance,B.decay=H.decay,H.castShadow){const q=H.shadow,j=n.get(H);j.shadowIntensity=q.intensity,j.shadowBias=q.bias,j.shadowNormalBias=q.normalBias,j.shadowRadius=q.radius,j.shadowMapSize=q.mapSize,j.shadowCameraNear=q.camera.near,j.shadowCameraFar=q.camera.far,s.pointShadow[b]=j,s.pointShadowMap[b]=lt,s.pointShadowMatrix[b]=H.shadow.matrix,w++}s.point[b]=B,b++}else if(H.isHemisphereLight){const B=t.get(H);B.skyColor.copy(H.color).multiplyScalar(ct),B.groundColor.copy(H.groundColor).multiplyScalar(ct),s.hemi[y]=B,y++}}M>0&&(r.has("OES_texture_float_linear")===!0?(s.rectAreaLTC1=It.LTC_FLOAT_1,s.rectAreaLTC2=It.LTC_FLOAT_2):(s.rectAreaLTC1=It.LTC_HALF_1,s.rectAreaLTC2=It.LTC_HALF_2)),s.ambient[0]=x,s.ambient[1]=g,s.ambient[2]=_;const Q=s.hash;(Q.directionalLength!==S||Q.pointLength!==b||Q.spotLength!==A||Q.rectAreaLength!==M||Q.hemiLength!==y||Q.numDirectionalShadows!==z||Q.numPointShadows!==w||Q.numSpotShadows!==O||Q.numSpotMaps!==k||Q.numLightProbes!==F)&&(s.directional.length=S,s.spot.length=A,s.rectArea.length=M,s.point.length=b,s.hemi.length=y,s.directionalShadow.length=z,s.directionalShadowMap.length=z,s.pointShadow.length=w,s.pointShadowMap.length=w,s.spotShadow.length=O,s.spotShadowMap.length=O,s.directionalShadowMatrix.length=z,s.pointShadowMatrix.length=w,s.spotLightMatrix.length=O+k-P,s.spotLightMap.length=k,s.numSpotLightShadowsWithMaps=P,s.numLightProbes=F,Q.directionalLength=S,Q.pointLength=b,Q.spotLength=A,Q.rectAreaLength=M,Q.hemiLength=y,Q.numDirectionalShadows=z,Q.numPointShadows=w,Q.numSpotShadows=O,Q.numSpotMaps=k,Q.numLightProbes=F,s.version=QT++)}function m(p,x){let g=0,_=0,S=0,b=0,A=0;const M=x.matrixWorldInverse;for(let y=0,z=p.length;y<z;y++){const w=p[y];if(w.isDirectionalLight){const O=s.directional[g];O.direction.setFromMatrixPosition(w.matrixWorld),l.setFromMatrixPosition(w.target.matrixWorld),O.direction.sub(l),O.direction.transformDirection(M),g++}else if(w.isSpotLight){const O=s.spot[S];O.position.setFromMatrixPosition(w.matrixWorld),O.position.applyMatrix4(M),O.direction.setFromMatrixPosition(w.matrixWorld),l.setFromMatrixPosition(w.target.matrixWorld),O.direction.sub(l),O.direction.transformDirection(M),S++}else if(w.isRectAreaLight){const O=s.rectArea[b];O.position.setFromMatrixPosition(w.matrixWorld),O.position.applyMatrix4(M),f.identity(),c.copy(w.matrixWorld),c.premultiply(M),f.extractRotation(c),O.halfWidth.set(w.width*.5,0,0),O.halfHeight.set(0,w.height*.5,0),O.halfWidth.applyMatrix4(f),O.halfHeight.applyMatrix4(f),b++}else if(w.isPointLight){const O=s.point[_];O.position.setFromMatrixPosition(w.matrixWorld),O.position.applyMatrix4(M),_++}else if(w.isHemisphereLight){const O=s.hemi[A];O.direction.setFromMatrixPosition(w.matrixWorld),O.direction.transformDirection(M),A++}}}return{setup:d,setupView:m,state:s}}function p_(r){const t=new $T(r),n=[],s=[];function l(x){p.camera=x,n.length=0,s.length=0}function c(x){n.push(x)}function f(x){s.push(x)}function d(){t.setup(n)}function m(x){t.setupView(n,x)}const p={lightsArray:n,shadowsArray:s,camera:null,lights:t,transmissionRenderTarget:{}};return{init:l,state:p,setupLights:d,setupLightsView:m,pushLight:c,pushShadow:f}}function tA(r){let t=new WeakMap;function n(l,c=0){const f=t.get(l);let d;return f===void 0?(d=new p_(r),t.set(l,[d])):c>=f.length?(d=new p_(r),f.push(d)):d=f[c],d}function s(){t=new WeakMap}return{get:n,dispose:s}}const eA=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,nA=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function iA(r,t,n){let s=new hp;const l=new Nt,c=new Nt,f=new sn,d=new Mb({depthPacking:JS}),m=new bb,p={},x=n.maxTextureSize,g={[ns]:jn,[jn]:ns,[ma]:ma},_=new ya({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Nt},radius:{value:4}},vertexShader:eA,fragmentShader:nA}),S=_.clone();S.defines.HORIZONTAL_PASS=1;const b=new Zn;b.setAttribute("position",new Bi(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const A=new Hi(b,_),M=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=__;let y=this.type;this.render=function(P,F,Q){if(M.enabled===!1||M.autoUpdate===!1&&M.needsUpdate===!1||P.length===0)return;const D=r.getRenderTarget(),C=r.getActiveCubeFace(),H=r.getActiveMipmapLevel(),nt=r.state;nt.setBlending(_a),nt.buffers.depth.getReversed()===!0?nt.buffers.color.setClear(0,0,0,0):nt.buffers.color.setClear(1,1,1,1),nt.buffers.depth.setTest(!0),nt.setScissorTest(!1);const ct=y!==pa&&this.type===pa,pt=y===pa&&this.type!==pa;for(let lt=0,B=P.length;lt<B;lt++){const q=P[lt],j=q.shadow;if(j===void 0){fe("WebGLShadowMap:",q,"has no shadow.");continue}if(j.autoUpdate===!1&&j.needsUpdate===!1)continue;l.copy(j.mapSize);const xt=j.getFrameExtents();if(l.multiply(xt),c.copy(j.mapSize),(l.x>x||l.y>x)&&(l.x>x&&(c.x=Math.floor(x/xt.x),l.x=c.x*xt.x,j.mapSize.x=c.x),l.y>x&&(c.y=Math.floor(x/xt.y),l.y=c.y*xt.y,j.mapSize.y=c.y)),j.map===null||ct===!0||pt===!0){const N=this.type!==pa?{minFilter:oi,magFilter:oi}:{};j.map!==null&&j.map.dispose(),j.map=new Ns(l.x,l.y,N),j.map.texture.name=q.name+".shadowMap",j.camera.updateProjectionMatrix()}r.setRenderTarget(j.map),r.clear();const vt=j.getViewportCount();for(let N=0;N<vt;N++){const it=j.getViewport(N);f.set(c.x*it.x,c.y*it.y,c.x*it.z,c.y*it.w),nt.viewport(f),j.updateMatrices(q,N),s=j.getFrustum(),O(F,Q,j.camera,q,this.type)}j.isPointLightShadow!==!0&&this.type===pa&&z(j,Q),j.needsUpdate=!1}y=this.type,M.needsUpdate=!1,r.setRenderTarget(D,C,H)};function z(P,F){const Q=t.update(A);_.defines.VSM_SAMPLES!==P.blurSamples&&(_.defines.VSM_SAMPLES=P.blurSamples,S.defines.VSM_SAMPLES=P.blurSamples,_.needsUpdate=!0,S.needsUpdate=!0),P.mapPass===null&&(P.mapPass=new Ns(l.x,l.y)),_.uniforms.shadow_pass.value=P.map.texture,_.uniforms.resolution.value=P.mapSize,_.uniforms.radius.value=P.radius,r.setRenderTarget(P.mapPass),r.clear(),r.renderBufferDirect(F,null,Q,_,A,null),S.uniforms.shadow_pass.value=P.mapPass.texture,S.uniforms.resolution.value=P.mapSize,S.uniforms.radius.value=P.radius,r.setRenderTarget(P.map),r.clear(),r.renderBufferDirect(F,null,Q,S,A,null)}function w(P,F,Q,D){let C=null;const H=Q.isPointLight===!0?P.customDistanceMaterial:P.customDepthMaterial;if(H!==void 0)C=H;else if(C=Q.isPointLight===!0?m:d,r.localClippingEnabled&&F.clipShadows===!0&&Array.isArray(F.clippingPlanes)&&F.clippingPlanes.length!==0||F.displacementMap&&F.displacementScale!==0||F.alphaMap&&F.alphaTest>0||F.map&&F.alphaTest>0||F.alphaToCoverage===!0){const nt=C.uuid,ct=F.uuid;let pt=p[nt];pt===void 0&&(pt={},p[nt]=pt);let lt=pt[ct];lt===void 0&&(lt=C.clone(),pt[ct]=lt,F.addEventListener("dispose",k)),C=lt}if(C.visible=F.visible,C.wireframe=F.wireframe,D===pa?C.side=F.shadowSide!==null?F.shadowSide:F.side:C.side=F.shadowSide!==null?F.shadowSide:g[F.side],C.alphaMap=F.alphaMap,C.alphaTest=F.alphaToCoverage===!0?.5:F.alphaTest,C.map=F.map,C.clipShadows=F.clipShadows,C.clippingPlanes=F.clippingPlanes,C.clipIntersection=F.clipIntersection,C.displacementMap=F.displacementMap,C.displacementScale=F.displacementScale,C.displacementBias=F.displacementBias,C.wireframeLinewidth=F.wireframeLinewidth,C.linewidth=F.linewidth,Q.isPointLight===!0&&C.isMeshDistanceMaterial===!0){const nt=r.properties.get(C);nt.light=Q}return C}function O(P,F,Q,D,C){if(P.visible===!1)return;if(P.layers.test(F.layers)&&(P.isMesh||P.isLine||P.isPoints)&&(P.castShadow||P.receiveShadow&&C===pa)&&(!P.frustumCulled||s.intersectsObject(P))){P.modelViewMatrix.multiplyMatrices(Q.matrixWorldInverse,P.matrixWorld);const ct=t.update(P),pt=P.material;if(Array.isArray(pt)){const lt=ct.groups;for(let B=0,q=lt.length;B<q;B++){const j=lt[B],xt=pt[j.materialIndex];if(xt&&xt.visible){const vt=w(P,xt,D,C);P.onBeforeShadow(r,P,F,Q,ct,vt,j),r.renderBufferDirect(Q,null,ct,vt,P,j),P.onAfterShadow(r,P,F,Q,ct,vt,j)}}}else if(pt.visible){const lt=w(P,pt,D,C);P.onBeforeShadow(r,P,F,Q,ct,lt,null),r.renderBufferDirect(Q,null,ct,lt,P,null),P.onAfterShadow(r,P,F,Q,ct,lt,null)}}const nt=P.children;for(let ct=0,pt=nt.length;ct<pt;ct++)O(nt[ct],F,Q,D,C)}function k(P){P.target.removeEventListener("dispose",k);for(const Q in p){const D=p[Q],C=P.target.uuid;C in D&&(D[C].dispose(),delete D[C])}}}const aA={[ud]:fd,[hd]:md,[dd]:xd,[Nr]:pd,[fd]:ud,[md]:hd,[xd]:dd,[pd]:Nr};function sA(r,t){function n(){let G=!1;const Bt=new sn;let Ut=null;const Lt=new sn(0,0,0,0);return{setMask:function(Et){Ut!==Et&&!G&&(r.colorMask(Et,Et,Et,Et),Ut=Et)},setLocked:function(Et){G=Et},setClear:function(Et,gt,qt,ue,He){He===!0&&(Et*=ue,gt*=ue,qt*=ue),Bt.set(Et,gt,qt,ue),Lt.equals(Bt)===!1&&(r.clearColor(Et,gt,qt,ue),Lt.copy(Bt))},reset:function(){G=!1,Ut=null,Lt.set(-1,0,0,0)}}}function s(){let G=!1,Bt=!1,Ut=null,Lt=null,Et=null;return{setReversed:function(gt){if(Bt!==gt){const qt=t.get("EXT_clip_control");gt?qt.clipControlEXT(qt.LOWER_LEFT_EXT,qt.ZERO_TO_ONE_EXT):qt.clipControlEXT(qt.LOWER_LEFT_EXT,qt.NEGATIVE_ONE_TO_ONE_EXT),Bt=gt;const ue=Et;Et=null,this.setClear(ue)}},getReversed:function(){return Bt},setTest:function(gt){gt?ut(r.DEPTH_TEST):Ot(r.DEPTH_TEST)},setMask:function(gt){Ut!==gt&&!G&&(r.depthMask(gt),Ut=gt)},setFunc:function(gt){if(Bt&&(gt=aA[gt]),Lt!==gt){switch(gt){case ud:r.depthFunc(r.NEVER);break;case fd:r.depthFunc(r.ALWAYS);break;case hd:r.depthFunc(r.LESS);break;case Nr:r.depthFunc(r.LEQUAL);break;case dd:r.depthFunc(r.EQUAL);break;case pd:r.depthFunc(r.GEQUAL);break;case md:r.depthFunc(r.GREATER);break;case xd:r.depthFunc(r.NOTEQUAL);break;default:r.depthFunc(r.LEQUAL)}Lt=gt}},setLocked:function(gt){G=gt},setClear:function(gt){Et!==gt&&(Bt&&(gt=1-gt),r.clearDepth(gt),Et=gt)},reset:function(){G=!1,Ut=null,Lt=null,Et=null,Bt=!1}}}function l(){let G=!1,Bt=null,Ut=null,Lt=null,Et=null,gt=null,qt=null,ue=null,He=null;return{setTest:function(De){G||(De?ut(r.STENCIL_TEST):Ot(r.STENCIL_TEST))},setMask:function(De){Bt!==De&&!G&&(r.stencilMask(De),Bt=De)},setFunc:function(De,Ln,Kn){(Ut!==De||Lt!==Ln||Et!==Kn)&&(r.stencilFunc(De,Ln,Kn),Ut=De,Lt=Ln,Et=Kn)},setOp:function(De,Ln,Kn){(gt!==De||qt!==Ln||ue!==Kn)&&(r.stencilOp(De,Ln,Kn),gt=De,qt=Ln,ue=Kn)},setLocked:function(De){G=De},setClear:function(De){He!==De&&(r.clearStencil(De),He=De)},reset:function(){G=!1,Bt=null,Ut=null,Lt=null,Et=null,gt=null,qt=null,ue=null,He=null}}}const c=new n,f=new s,d=new l,m=new WeakMap,p=new WeakMap;let x={},g={},_=new WeakMap,S=[],b=null,A=!1,M=null,y=null,z=null,w=null,O=null,k=null,P=null,F=new Te(0,0,0),Q=0,D=!1,C=null,H=null,nt=null,ct=null,pt=null;const lt=r.getParameter(r.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,q=0;const j=r.getParameter(r.VERSION);j.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(j)[1]),B=q>=1):j.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),B=q>=2);let xt=null,vt={};const N=r.getParameter(r.SCISSOR_BOX),it=r.getParameter(r.VIEWPORT),_t=new sn().fromArray(N),Rt=new sn().fromArray(it);function Gt(G,Bt,Ut,Lt){const Et=new Uint8Array(4),gt=r.createTexture();r.bindTexture(G,gt),r.texParameteri(G,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(G,r.TEXTURE_MAG_FILTER,r.NEAREST);for(let qt=0;qt<Ut;qt++)G===r.TEXTURE_3D||G===r.TEXTURE_2D_ARRAY?r.texImage3D(Bt,0,r.RGBA,1,1,Lt,0,r.RGBA,r.UNSIGNED_BYTE,Et):r.texImage2D(Bt+qt,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,Et);return gt}const at={};at[r.TEXTURE_2D]=Gt(r.TEXTURE_2D,r.TEXTURE_2D,1),at[r.TEXTURE_CUBE_MAP]=Gt(r.TEXTURE_CUBE_MAP,r.TEXTURE_CUBE_MAP_POSITIVE_X,6),at[r.TEXTURE_2D_ARRAY]=Gt(r.TEXTURE_2D_ARRAY,r.TEXTURE_2D_ARRAY,1,1),at[r.TEXTURE_3D]=Gt(r.TEXTURE_3D,r.TEXTURE_3D,1,1),c.setClear(0,0,0,1),f.setClear(1),d.setClear(0),ut(r.DEPTH_TEST),f.setFunc(Nr),bt(!1),Ct(og),ut(r.CULL_FACE),yt(_a);function ut(G){x[G]!==!0&&(r.enable(G),x[G]=!0)}function Ot(G){x[G]!==!1&&(r.disable(G),x[G]=!1)}function Ht(G,Bt){return g[G]!==Bt?(r.bindFramebuffer(G,Bt),g[G]=Bt,G===r.DRAW_FRAMEBUFFER&&(g[r.FRAMEBUFFER]=Bt),G===r.FRAMEBUFFER&&(g[r.DRAW_FRAMEBUFFER]=Bt),!0):!1}function Zt(G,Bt){let Ut=S,Lt=!1;if(G){Ut=_.get(Bt),Ut===void 0&&(Ut=[],_.set(Bt,Ut));const Et=G.textures;if(Ut.length!==Et.length||Ut[0]!==r.COLOR_ATTACHMENT0){for(let gt=0,qt=Et.length;gt<qt;gt++)Ut[gt]=r.COLOR_ATTACHMENT0+gt;Ut.length=Et.length,Lt=!0}}else Ut[0]!==r.BACK&&(Ut[0]=r.BACK,Lt=!0);Lt&&r.drawBuffers(Ut)}function pe(G){return b!==G?(r.useProgram(G),b=G,!0):!1}const Pe={[ws]:r.FUNC_ADD,[ES]:r.FUNC_SUBTRACT,[TS]:r.FUNC_REVERSE_SUBTRACT};Pe[AS]=r.MIN,Pe[RS]=r.MAX;const oe={[CS]:r.ZERO,[wS]:r.ONE,[DS]:r.SRC_COLOR,[ld]:r.SRC_ALPHA,[zS]:r.SRC_ALPHA_SATURATE,[OS]:r.DST_COLOR,[LS]:r.DST_ALPHA,[US]:r.ONE_MINUS_SRC_COLOR,[cd]:r.ONE_MINUS_SRC_ALPHA,[PS]:r.ONE_MINUS_DST_COLOR,[NS]:r.ONE_MINUS_DST_ALPHA,[BS]:r.CONSTANT_COLOR,[FS]:r.ONE_MINUS_CONSTANT_COLOR,[IS]:r.CONSTANT_ALPHA,[HS]:r.ONE_MINUS_CONSTANT_ALPHA};function yt(G,Bt,Ut,Lt,Et,gt,qt,ue,He,De){if(G===_a){A===!0&&(Ot(r.BLEND),A=!1);return}if(A===!1&&(ut(r.BLEND),A=!0),G!==bS){if(G!==M||De!==D){if((y!==ws||O!==ws)&&(r.blendEquation(r.FUNC_ADD),y=ws,O=ws),De)switch(G){case Ur:r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case lg:r.blendFunc(r.ONE,r.ONE);break;case cg:r.blendFuncSeparate(r.ZERO,r.ONE_MINUS_SRC_COLOR,r.ZERO,r.ONE);break;case ug:r.blendFuncSeparate(r.DST_COLOR,r.ONE_MINUS_SRC_ALPHA,r.ZERO,r.ONE);break;default:an("WebGLState: Invalid blending: ",G);break}else switch(G){case Ur:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case lg:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE,r.ONE,r.ONE);break;case cg:an("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ug:an("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:an("WebGLState: Invalid blending: ",G);break}z=null,w=null,k=null,P=null,F.set(0,0,0),Q=0,M=G,D=De}return}Et=Et||Bt,gt=gt||Ut,qt=qt||Lt,(Bt!==y||Et!==O)&&(r.blendEquationSeparate(Pe[Bt],Pe[Et]),y=Bt,O=Et),(Ut!==z||Lt!==w||gt!==k||qt!==P)&&(r.blendFuncSeparate(oe[Ut],oe[Lt],oe[gt],oe[qt]),z=Ut,w=Lt,k=gt,P=qt),(ue.equals(F)===!1||He!==Q)&&(r.blendColor(ue.r,ue.g,ue.b,He),F.copy(ue),Q=He),M=G,D=!1}function L(G,Bt){G.side===ma?Ot(r.CULL_FACE):ut(r.CULL_FACE);let Ut=G.side===jn;Bt&&(Ut=!Ut),bt(Ut),G.blending===Ur&&G.transparent===!1?yt(_a):yt(G.blending,G.blendEquation,G.blendSrc,G.blendDst,G.blendEquationAlpha,G.blendSrcAlpha,G.blendDstAlpha,G.blendColor,G.blendAlpha,G.premultipliedAlpha),f.setFunc(G.depthFunc),f.setTest(G.depthTest),f.setMask(G.depthWrite),c.setMask(G.colorWrite);const Lt=G.stencilWrite;d.setTest(Lt),Lt&&(d.setMask(G.stencilWriteMask),d.setFunc(G.stencilFunc,G.stencilRef,G.stencilFuncMask),d.setOp(G.stencilFail,G.stencilZFail,G.stencilZPass)),Tt(G.polygonOffset,G.polygonOffsetFactor,G.polygonOffsetUnits),G.alphaToCoverage===!0?ut(r.SAMPLE_ALPHA_TO_COVERAGE):Ot(r.SAMPLE_ALPHA_TO_COVERAGE)}function bt(G){C!==G&&(G?r.frontFace(r.CW):r.frontFace(r.CCW),C=G)}function Ct(G){G!==yS?(ut(r.CULL_FACE),G!==H&&(G===og?r.cullFace(r.BACK):G===SS?r.cullFace(r.FRONT):r.cullFace(r.FRONT_AND_BACK))):Ot(r.CULL_FACE),H=G}function Dt(G){G!==nt&&(B&&r.lineWidth(G),nt=G)}function Tt(G,Bt,Ut){G?(ut(r.POLYGON_OFFSET_FILL),(ct!==Bt||pt!==Ut)&&(r.polygonOffset(Bt,Ut),ct=Bt,pt=Ut)):Ot(r.POLYGON_OFFSET_FILL)}function Wt(G){G?ut(r.SCISSOR_TEST):Ot(r.SCISSOR_TEST)}function Pt(G){G===void 0&&(G=r.TEXTURE0+lt-1),xt!==G&&(r.activeTexture(G),xt=G)}function kt(G,Bt,Ut){Ut===void 0&&(xt===null?Ut=r.TEXTURE0+lt-1:Ut=xt);let Lt=vt[Ut];Lt===void 0&&(Lt={type:void 0,texture:void 0},vt[Ut]=Lt),(Lt.type!==G||Lt.texture!==Bt)&&(xt!==Ut&&(r.activeTexture(Ut),xt=Ut),r.bindTexture(G,Bt||at[G]),Lt.type=G,Lt.texture=Bt)}function U(){const G=vt[xt];G!==void 0&&G.type!==void 0&&(r.bindTexture(G.type,null),G.type=void 0,G.texture=void 0)}function E(){try{r.compressedTexImage2D(...arguments)}catch(G){G("WebGLState:",G)}}function K(){try{r.compressedTexImage3D(...arguments)}catch(G){G("WebGLState:",G)}}function ft(){try{r.texSubImage2D(...arguments)}catch(G){G("WebGLState:",G)}}function St(){try{r.texSubImage3D(...arguments)}catch(G){G("WebGLState:",G)}}function ot(){try{r.compressedTexSubImage2D(...arguments)}catch(G){G("WebGLState:",G)}}function $t(){try{r.compressedTexSubImage3D(...arguments)}catch(G){G("WebGLState:",G)}}function zt(){try{r.texStorage2D(...arguments)}catch(G){G("WebGLState:",G)}}function ee(){try{r.texStorage3D(...arguments)}catch(G){G("WebGLState:",G)}}function Qt(){try{r.texImage2D(...arguments)}catch(G){G("WebGLState:",G)}}function Mt(){try{r.texImage3D(...arguments)}catch(G){G("WebGLState:",G)}}function At(G){_t.equals(G)===!1&&(r.scissor(G.x,G.y,G.z,G.w),_t.copy(G))}function te(G){Rt.equals(G)===!1&&(r.viewport(G.x,G.y,G.z,G.w),Rt.copy(G))}function Kt(G,Bt){let Ut=p.get(Bt);Ut===void 0&&(Ut=new WeakMap,p.set(Bt,Ut));let Lt=Ut.get(G);Lt===void 0&&(Lt=r.getUniformBlockIndex(Bt,G.name),Ut.set(G,Lt))}function Vt(G,Bt){const Lt=p.get(Bt).get(G);m.get(Bt)!==Lt&&(r.uniformBlockBinding(Bt,Lt,G.__bindingPointIndex),m.set(Bt,Lt))}function ce(){r.disable(r.BLEND),r.disable(r.CULL_FACE),r.disable(r.DEPTH_TEST),r.disable(r.POLYGON_OFFSET_FILL),r.disable(r.SCISSOR_TEST),r.disable(r.STENCIL_TEST),r.disable(r.SAMPLE_ALPHA_TO_COVERAGE),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ZERO),r.blendFuncSeparate(r.ONE,r.ZERO,r.ONE,r.ZERO),r.blendColor(0,0,0,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(r.LESS),f.setReversed(!1),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(r.ALWAYS,0,4294967295),r.stencilOp(r.KEEP,r.KEEP,r.KEEP),r.clearStencil(0),r.cullFace(r.BACK),r.frontFace(r.CCW),r.polygonOffset(0,0),r.activeTexture(r.TEXTURE0),r.bindFramebuffer(r.FRAMEBUFFER,null),r.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),x={},xt=null,vt={},g={},_=new WeakMap,S=[],b=null,A=!1,M=null,y=null,z=null,w=null,O=null,k=null,P=null,F=new Te(0,0,0),Q=0,D=!1,C=null,H=null,nt=null,ct=null,pt=null,_t.set(0,0,r.canvas.width,r.canvas.height),Rt.set(0,0,r.canvas.width,r.canvas.height),c.reset(),f.reset(),d.reset()}return{buffers:{color:c,depth:f,stencil:d},enable:ut,disable:Ot,bindFramebuffer:Ht,drawBuffers:Zt,useProgram:pe,setBlending:yt,setMaterial:L,setFlipSided:bt,setCullFace:Ct,setLineWidth:Dt,setPolygonOffset:Tt,setScissorTest:Wt,activeTexture:Pt,bindTexture:kt,unbindTexture:U,compressedTexImage2D:E,compressedTexImage3D:K,texImage2D:Qt,texImage3D:Mt,updateUBOMapping:Kt,uniformBlockBinding:Vt,texStorage2D:zt,texStorage3D:ee,texSubImage2D:ft,texSubImage3D:St,compressedTexSubImage2D:ot,compressedTexSubImage3D:$t,scissor:At,viewport:te,reset:ce}}function rA(r,t,n,s,l,c,f){const d=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,m=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),p=new Nt,x=new WeakMap;let g;const _=new WeakMap;let S=!1;try{S=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function b(U,E){return S?new OffscreenCanvas(U,E):nu("canvas")}function A(U,E,K){let ft=1;const St=kt(U);if((St.width>K||St.height>K)&&(ft=K/Math.max(St.width,St.height)),ft<1)if(typeof HTMLImageElement<"u"&&U instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&U instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&U instanceof ImageBitmap||typeof VideoFrame<"u"&&U instanceof VideoFrame){const ot=Math.floor(ft*St.width),$t=Math.floor(ft*St.height);g===void 0&&(g=b(ot,$t));const zt=E?b(ot,$t):g;return zt.width=ot,zt.height=$t,zt.getContext("2d").drawImage(U,0,0,ot,$t),fe("WebGLRenderer: Texture has been resized from ("+St.width+"x"+St.height+") to ("+ot+"x"+$t+")."),zt}else return"data"in U&&fe("WebGLRenderer: Image in DataTexture is too big ("+St.width+"x"+St.height+")."),U;return U}function M(U){return U.generateMipmaps}function y(U){r.generateMipmap(U)}function z(U){return U.isWebGLCubeRenderTarget?r.TEXTURE_CUBE_MAP:U.isWebGL3DRenderTarget?r.TEXTURE_3D:U.isWebGLArrayRenderTarget||U.isCompressedArrayTexture?r.TEXTURE_2D_ARRAY:r.TEXTURE_2D}function w(U,E,K,ft,St=!1){if(U!==null){if(r[U]!==void 0)return r[U];fe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+U+"'")}let ot=E;if(E===r.RED&&(K===r.FLOAT&&(ot=r.R32F),K===r.HALF_FLOAT&&(ot=r.R16F),K===r.UNSIGNED_BYTE&&(ot=r.R8)),E===r.RED_INTEGER&&(K===r.UNSIGNED_BYTE&&(ot=r.R8UI),K===r.UNSIGNED_SHORT&&(ot=r.R16UI),K===r.UNSIGNED_INT&&(ot=r.R32UI),K===r.BYTE&&(ot=r.R8I),K===r.SHORT&&(ot=r.R16I),K===r.INT&&(ot=r.R32I)),E===r.RG&&(K===r.FLOAT&&(ot=r.RG32F),K===r.HALF_FLOAT&&(ot=r.RG16F),K===r.UNSIGNED_BYTE&&(ot=r.RG8)),E===r.RG_INTEGER&&(K===r.UNSIGNED_BYTE&&(ot=r.RG8UI),K===r.UNSIGNED_SHORT&&(ot=r.RG16UI),K===r.UNSIGNED_INT&&(ot=r.RG32UI),K===r.BYTE&&(ot=r.RG8I),K===r.SHORT&&(ot=r.RG16I),K===r.INT&&(ot=r.RG32I)),E===r.RGB_INTEGER&&(K===r.UNSIGNED_BYTE&&(ot=r.RGB8UI),K===r.UNSIGNED_SHORT&&(ot=r.RGB16UI),K===r.UNSIGNED_INT&&(ot=r.RGB32UI),K===r.BYTE&&(ot=r.RGB8I),K===r.SHORT&&(ot=r.RGB16I),K===r.INT&&(ot=r.RGB32I)),E===r.RGBA_INTEGER&&(K===r.UNSIGNED_BYTE&&(ot=r.RGBA8UI),K===r.UNSIGNED_SHORT&&(ot=r.RGBA16UI),K===r.UNSIGNED_INT&&(ot=r.RGBA32UI),K===r.BYTE&&(ot=r.RGBA8I),K===r.SHORT&&(ot=r.RGBA16I),K===r.INT&&(ot=r.RGBA32I)),E===r.RGB&&(K===r.UNSIGNED_INT_5_9_9_9_REV&&(ot=r.RGB9_E5),K===r.UNSIGNED_INT_10F_11F_11F_REV&&(ot=r.R11F_G11F_B10F)),E===r.RGBA){const $t=St?tu:Oe.getTransfer(ft);K===r.FLOAT&&(ot=r.RGBA32F),K===r.HALF_FLOAT&&(ot=r.RGBA16F),K===r.UNSIGNED_BYTE&&(ot=$t===Xe?r.SRGB8_ALPHA8:r.RGBA8),K===r.UNSIGNED_SHORT_4_4_4_4&&(ot=r.RGBA4),K===r.UNSIGNED_SHORT_5_5_5_1&&(ot=r.RGB5_A1)}return(ot===r.R16F||ot===r.R32F||ot===r.RG16F||ot===r.RG32F||ot===r.RGBA16F||ot===r.RGBA32F)&&t.get("EXT_color_buffer_float"),ot}function O(U,E){let K;return U?E===null||E===Ls||E===$o?K=r.DEPTH24_STENCIL8:E===ga?K=r.DEPTH32F_STENCIL8:E===Jo&&(K=r.DEPTH24_STENCIL8,fe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):E===null||E===Ls||E===$o?K=r.DEPTH_COMPONENT24:E===ga?K=r.DEPTH_COMPONENT32F:E===Jo&&(K=r.DEPTH_COMPONENT16),K}function k(U,E){return M(U)===!0||U.isFramebufferTexture&&U.minFilter!==oi&&U.minFilter!==yi?Math.log2(Math.max(E.width,E.height))+1:U.mipmaps!==void 0&&U.mipmaps.length>0?U.mipmaps.length:U.isCompressedTexture&&Array.isArray(U.image)?E.mipmaps.length:1}function P(U){const E=U.target;E.removeEventListener("dispose",P),Q(E),E.isVideoTexture&&x.delete(E)}function F(U){const E=U.target;E.removeEventListener("dispose",F),C(E)}function Q(U){const E=s.get(U);if(E.__webglInit===void 0)return;const K=U.source,ft=_.get(K);if(ft){const St=ft[E.__cacheKey];St.usedTimes--,St.usedTimes===0&&D(U),Object.keys(ft).length===0&&_.delete(K)}s.remove(U)}function D(U){const E=s.get(U);r.deleteTexture(E.__webglTexture);const K=U.source,ft=_.get(K);delete ft[E.__cacheKey],f.memory.textures--}function C(U){const E=s.get(U);if(U.depthTexture&&(U.depthTexture.dispose(),s.remove(U.depthTexture)),U.isWebGLCubeRenderTarget)for(let ft=0;ft<6;ft++){if(Array.isArray(E.__webglFramebuffer[ft]))for(let St=0;St<E.__webglFramebuffer[ft].length;St++)r.deleteFramebuffer(E.__webglFramebuffer[ft][St]);else r.deleteFramebuffer(E.__webglFramebuffer[ft]);E.__webglDepthbuffer&&r.deleteRenderbuffer(E.__webglDepthbuffer[ft])}else{if(Array.isArray(E.__webglFramebuffer))for(let ft=0;ft<E.__webglFramebuffer.length;ft++)r.deleteFramebuffer(E.__webglFramebuffer[ft]);else r.deleteFramebuffer(E.__webglFramebuffer);if(E.__webglDepthbuffer&&r.deleteRenderbuffer(E.__webglDepthbuffer),E.__webglMultisampledFramebuffer&&r.deleteFramebuffer(E.__webglMultisampledFramebuffer),E.__webglColorRenderbuffer)for(let ft=0;ft<E.__webglColorRenderbuffer.length;ft++)E.__webglColorRenderbuffer[ft]&&r.deleteRenderbuffer(E.__webglColorRenderbuffer[ft]);E.__webglDepthRenderbuffer&&r.deleteRenderbuffer(E.__webglDepthRenderbuffer)}const K=U.textures;for(let ft=0,St=K.length;ft<St;ft++){const ot=s.get(K[ft]);ot.__webglTexture&&(r.deleteTexture(ot.__webglTexture),f.memory.textures--),s.remove(K[ft])}s.remove(U)}let H=0;function nt(){H=0}function ct(){const U=H;return U>=l.maxTextures&&fe("WebGLTextures: Trying to use "+U+" texture units while this GPU supports only "+l.maxTextures),H+=1,U}function pt(U){const E=[];return E.push(U.wrapS),E.push(U.wrapT),E.push(U.wrapR||0),E.push(U.magFilter),E.push(U.minFilter),E.push(U.anisotropy),E.push(U.internalFormat),E.push(U.format),E.push(U.type),E.push(U.generateMipmaps),E.push(U.premultiplyAlpha),E.push(U.flipY),E.push(U.unpackAlignment),E.push(U.colorSpace),E.join()}function lt(U,E){const K=s.get(U);if(U.isVideoTexture&&Wt(U),U.isRenderTargetTexture===!1&&U.isExternalTexture!==!0&&U.version>0&&K.__version!==U.version){const ft=U.image;if(ft===null)fe("WebGLRenderer: Texture marked for update but no image data found.");else if(ft.complete===!1)fe("WebGLRenderer: Texture marked for update but image is incomplete");else{at(K,U,E);return}}else U.isExternalTexture&&(K.__webglTexture=U.sourceTexture?U.sourceTexture:null);n.bindTexture(r.TEXTURE_2D,K.__webglTexture,r.TEXTURE0+E)}function B(U,E){const K=s.get(U);if(U.isRenderTargetTexture===!1&&U.version>0&&K.__version!==U.version){at(K,U,E);return}else U.isExternalTexture&&(K.__webglTexture=U.sourceTexture?U.sourceTexture:null);n.bindTexture(r.TEXTURE_2D_ARRAY,K.__webglTexture,r.TEXTURE0+E)}function q(U,E){const K=s.get(U);if(U.isRenderTargetTexture===!1&&U.version>0&&K.__version!==U.version){at(K,U,E);return}n.bindTexture(r.TEXTURE_3D,K.__webglTexture,r.TEXTURE0+E)}function j(U,E){const K=s.get(U);if(U.version>0&&K.__version!==U.version){ut(K,U,E);return}n.bindTexture(r.TEXTURE_CUBE_MAP,K.__webglTexture,r.TEXTURE0+E)}const xt={[vd]:r.REPEAT,[xa]:r.CLAMP_TO_EDGE,[yd]:r.MIRRORED_REPEAT},vt={[oi]:r.NEAREST,[KS]:r.NEAREST_MIPMAP_NEAREST,[_c]:r.NEAREST_MIPMAP_LINEAR,[yi]:r.LINEAR,[Ah]:r.LINEAR_MIPMAP_NEAREST,[Us]:r.LINEAR_MIPMAP_LINEAR},N={[tM]:r.NEVER,[rM]:r.ALWAYS,[eM]:r.LESS,[w_]:r.LEQUAL,[nM]:r.EQUAL,[sM]:r.GEQUAL,[iM]:r.GREATER,[aM]:r.NOTEQUAL};function it(U,E){if(E.type===ga&&t.has("OES_texture_float_linear")===!1&&(E.magFilter===yi||E.magFilter===Ah||E.magFilter===_c||E.magFilter===Us||E.minFilter===yi||E.minFilter===Ah||E.minFilter===_c||E.minFilter===Us)&&fe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),r.texParameteri(U,r.TEXTURE_WRAP_S,xt[E.wrapS]),r.texParameteri(U,r.TEXTURE_WRAP_T,xt[E.wrapT]),(U===r.TEXTURE_3D||U===r.TEXTURE_2D_ARRAY)&&r.texParameteri(U,r.TEXTURE_WRAP_R,xt[E.wrapR]),r.texParameteri(U,r.TEXTURE_MAG_FILTER,vt[E.magFilter]),r.texParameteri(U,r.TEXTURE_MIN_FILTER,vt[E.minFilter]),E.compareFunction&&(r.texParameteri(U,r.TEXTURE_COMPARE_MODE,r.COMPARE_REF_TO_TEXTURE),r.texParameteri(U,r.TEXTURE_COMPARE_FUNC,N[E.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(E.magFilter===oi||E.minFilter!==_c&&E.minFilter!==Us||E.type===ga&&t.has("OES_texture_float_linear")===!1)return;if(E.anisotropy>1||s.get(E).__currentAnisotropy){const K=t.get("EXT_texture_filter_anisotropic");r.texParameterf(U,K.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(E.anisotropy,l.getMaxAnisotropy())),s.get(E).__currentAnisotropy=E.anisotropy}}}function _t(U,E){let K=!1;U.__webglInit===void 0&&(U.__webglInit=!0,E.addEventListener("dispose",P));const ft=E.source;let St=_.get(ft);St===void 0&&(St={},_.set(ft,St));const ot=pt(E);if(ot!==U.__cacheKey){St[ot]===void 0&&(St[ot]={texture:r.createTexture(),usedTimes:0},f.memory.textures++,K=!0),St[ot].usedTimes++;const $t=St[U.__cacheKey];$t!==void 0&&(St[U.__cacheKey].usedTimes--,$t.usedTimes===0&&D(E)),U.__cacheKey=ot,U.__webglTexture=St[ot].texture}return K}function Rt(U,E,K){return Math.floor(Math.floor(U/K)/E)}function Gt(U,E,K,ft){const ot=U.updateRanges;if(ot.length===0)n.texSubImage2D(r.TEXTURE_2D,0,0,0,E.width,E.height,K,ft,E.data);else{ot.sort((Mt,At)=>Mt.start-At.start);let $t=0;for(let Mt=1;Mt<ot.length;Mt++){const At=ot[$t],te=ot[Mt],Kt=At.start+At.count,Vt=Rt(te.start,E.width,4),ce=Rt(At.start,E.width,4);te.start<=Kt+1&&Vt===ce&&Rt(te.start+te.count-1,E.width,4)===Vt?At.count=Math.max(At.count,te.start+te.count-At.start):(++$t,ot[$t]=te)}ot.length=$t+1;const zt=r.getParameter(r.UNPACK_ROW_LENGTH),ee=r.getParameter(r.UNPACK_SKIP_PIXELS),Qt=r.getParameter(r.UNPACK_SKIP_ROWS);r.pixelStorei(r.UNPACK_ROW_LENGTH,E.width);for(let Mt=0,At=ot.length;Mt<At;Mt++){const te=ot[Mt],Kt=Math.floor(te.start/4),Vt=Math.ceil(te.count/4),ce=Kt%E.width,G=Math.floor(Kt/E.width),Bt=Vt,Ut=1;r.pixelStorei(r.UNPACK_SKIP_PIXELS,ce),r.pixelStorei(r.UNPACK_SKIP_ROWS,G),n.texSubImage2D(r.TEXTURE_2D,0,ce,G,Bt,Ut,K,ft,E.data)}U.clearUpdateRanges(),r.pixelStorei(r.UNPACK_ROW_LENGTH,zt),r.pixelStorei(r.UNPACK_SKIP_PIXELS,ee),r.pixelStorei(r.UNPACK_SKIP_ROWS,Qt)}}function at(U,E,K){let ft=r.TEXTURE_2D;(E.isDataArrayTexture||E.isCompressedArrayTexture)&&(ft=r.TEXTURE_2D_ARRAY),E.isData3DTexture&&(ft=r.TEXTURE_3D);const St=_t(U,E),ot=E.source;n.bindTexture(ft,U.__webglTexture,r.TEXTURE0+K);const $t=s.get(ot);if(ot.version!==$t.__version||St===!0){n.activeTexture(r.TEXTURE0+K);const zt=Oe.getPrimaries(Oe.workingColorSpace),ee=E.colorSpace===$a?null:Oe.getPrimaries(E.colorSpace),Qt=E.colorSpace===$a||zt===ee?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,E.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,E.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,Qt);let Mt=A(E.image,!1,l.maxTextureSize);Mt=Pt(E,Mt);const At=c.convert(E.format,E.colorSpace),te=c.convert(E.type);let Kt=w(E.internalFormat,At,te,E.colorSpace,E.isVideoTexture);it(ft,E);let Vt;const ce=E.mipmaps,G=E.isVideoTexture!==!0,Bt=$t.__version===void 0||St===!0,Ut=ot.dataReady,Lt=k(E,Mt);if(E.isDepthTexture)Kt=O(E.format===el,E.type),Bt&&(G?n.texStorage2D(r.TEXTURE_2D,1,Kt,Mt.width,Mt.height):n.texImage2D(r.TEXTURE_2D,0,Kt,Mt.width,Mt.height,0,At,te,null));else if(E.isDataTexture)if(ce.length>0){G&&Bt&&n.texStorage2D(r.TEXTURE_2D,Lt,Kt,ce[0].width,ce[0].height);for(let Et=0,gt=ce.length;Et<gt;Et++)Vt=ce[Et],G?Ut&&n.texSubImage2D(r.TEXTURE_2D,Et,0,0,Vt.width,Vt.height,At,te,Vt.data):n.texImage2D(r.TEXTURE_2D,Et,Kt,Vt.width,Vt.height,0,At,te,Vt.data);E.generateMipmaps=!1}else G?(Bt&&n.texStorage2D(r.TEXTURE_2D,Lt,Kt,Mt.width,Mt.height),Ut&&Gt(E,Mt,At,te)):n.texImage2D(r.TEXTURE_2D,0,Kt,Mt.width,Mt.height,0,At,te,Mt.data);else if(E.isCompressedTexture)if(E.isCompressedArrayTexture){G&&Bt&&n.texStorage3D(r.TEXTURE_2D_ARRAY,Lt,Kt,ce[0].width,ce[0].height,Mt.depth);for(let Et=0,gt=ce.length;Et<gt;Et++)if(Vt=ce[Et],E.format!==Ci)if(At!==null)if(G){if(Ut)if(E.layerUpdates.size>0){const qt=Wg(Vt.width,Vt.height,E.format,E.type);for(const ue of E.layerUpdates){const He=Vt.data.subarray(ue*qt/Vt.data.BYTES_PER_ELEMENT,(ue+1)*qt/Vt.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,Et,0,0,ue,Vt.width,Vt.height,1,At,He)}E.clearLayerUpdates()}else n.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,Et,0,0,0,Vt.width,Vt.height,Mt.depth,At,Vt.data)}else n.compressedTexImage3D(r.TEXTURE_2D_ARRAY,Et,Kt,Vt.width,Vt.height,Mt.depth,0,Vt.data,0,0);else fe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else G?Ut&&n.texSubImage3D(r.TEXTURE_2D_ARRAY,Et,0,0,0,Vt.width,Vt.height,Mt.depth,At,te,Vt.data):n.texImage3D(r.TEXTURE_2D_ARRAY,Et,Kt,Vt.width,Vt.height,Mt.depth,0,At,te,Vt.data)}else{G&&Bt&&n.texStorage2D(r.TEXTURE_2D,Lt,Kt,ce[0].width,ce[0].height);for(let Et=0,gt=ce.length;Et<gt;Et++)Vt=ce[Et],E.format!==Ci?At!==null?G?Ut&&n.compressedTexSubImage2D(r.TEXTURE_2D,Et,0,0,Vt.width,Vt.height,At,Vt.data):n.compressedTexImage2D(r.TEXTURE_2D,Et,Kt,Vt.width,Vt.height,0,Vt.data):fe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):G?Ut&&n.texSubImage2D(r.TEXTURE_2D,Et,0,0,Vt.width,Vt.height,At,te,Vt.data):n.texImage2D(r.TEXTURE_2D,Et,Kt,Vt.width,Vt.height,0,At,te,Vt.data)}else if(E.isDataArrayTexture)if(G){if(Bt&&n.texStorage3D(r.TEXTURE_2D_ARRAY,Lt,Kt,Mt.width,Mt.height,Mt.depth),Ut)if(E.layerUpdates.size>0){const Et=Wg(Mt.width,Mt.height,E.format,E.type);for(const gt of E.layerUpdates){const qt=Mt.data.subarray(gt*Et/Mt.data.BYTES_PER_ELEMENT,(gt+1)*Et/Mt.data.BYTES_PER_ELEMENT);n.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,gt,Mt.width,Mt.height,1,At,te,qt)}E.clearLayerUpdates()}else n.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,0,Mt.width,Mt.height,Mt.depth,At,te,Mt.data)}else n.texImage3D(r.TEXTURE_2D_ARRAY,0,Kt,Mt.width,Mt.height,Mt.depth,0,At,te,Mt.data);else if(E.isData3DTexture)G?(Bt&&n.texStorage3D(r.TEXTURE_3D,Lt,Kt,Mt.width,Mt.height,Mt.depth),Ut&&n.texSubImage3D(r.TEXTURE_3D,0,0,0,0,Mt.width,Mt.height,Mt.depth,At,te,Mt.data)):n.texImage3D(r.TEXTURE_3D,0,Kt,Mt.width,Mt.height,Mt.depth,0,At,te,Mt.data);else if(E.isFramebufferTexture){if(Bt)if(G)n.texStorage2D(r.TEXTURE_2D,Lt,Kt,Mt.width,Mt.height);else{let Et=Mt.width,gt=Mt.height;for(let qt=0;qt<Lt;qt++)n.texImage2D(r.TEXTURE_2D,qt,Kt,Et,gt,0,At,te,null),Et>>=1,gt>>=1}}else if(ce.length>0){if(G&&Bt){const Et=kt(ce[0]);n.texStorage2D(r.TEXTURE_2D,Lt,Kt,Et.width,Et.height)}for(let Et=0,gt=ce.length;Et<gt;Et++)Vt=ce[Et],G?Ut&&n.texSubImage2D(r.TEXTURE_2D,Et,0,0,At,te,Vt):n.texImage2D(r.TEXTURE_2D,Et,Kt,At,te,Vt);E.generateMipmaps=!1}else if(G){if(Bt){const Et=kt(Mt);n.texStorage2D(r.TEXTURE_2D,Lt,Kt,Et.width,Et.height)}Ut&&n.texSubImage2D(r.TEXTURE_2D,0,0,0,At,te,Mt)}else n.texImage2D(r.TEXTURE_2D,0,Kt,At,te,Mt);M(E)&&y(ft),$t.__version=ot.version,E.onUpdate&&E.onUpdate(E)}U.__version=E.version}function ut(U,E,K){if(E.image.length!==6)return;const ft=_t(U,E),St=E.source;n.bindTexture(r.TEXTURE_CUBE_MAP,U.__webglTexture,r.TEXTURE0+K);const ot=s.get(St);if(St.version!==ot.__version||ft===!0){n.activeTexture(r.TEXTURE0+K);const $t=Oe.getPrimaries(Oe.workingColorSpace),zt=E.colorSpace===$a?null:Oe.getPrimaries(E.colorSpace),ee=E.colorSpace===$a||$t===zt?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,E.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,E.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,ee);const Qt=E.isCompressedTexture||E.image[0].isCompressedTexture,Mt=E.image[0]&&E.image[0].isDataTexture,At=[];for(let gt=0;gt<6;gt++)!Qt&&!Mt?At[gt]=A(E.image[gt],!0,l.maxCubemapSize):At[gt]=Mt?E.image[gt].image:E.image[gt],At[gt]=Pt(E,At[gt]);const te=At[0],Kt=c.convert(E.format,E.colorSpace),Vt=c.convert(E.type),ce=w(E.internalFormat,Kt,Vt,E.colorSpace),G=E.isVideoTexture!==!0,Bt=ot.__version===void 0||ft===!0,Ut=St.dataReady;let Lt=k(E,te);it(r.TEXTURE_CUBE_MAP,E);let Et;if(Qt){G&&Bt&&n.texStorage2D(r.TEXTURE_CUBE_MAP,Lt,ce,te.width,te.height);for(let gt=0;gt<6;gt++){Et=At[gt].mipmaps;for(let qt=0;qt<Et.length;qt++){const ue=Et[qt];E.format!==Ci?Kt!==null?G?Ut&&n.compressedTexSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,qt,0,0,ue.width,ue.height,Kt,ue.data):n.compressedTexImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,qt,ce,ue.width,ue.height,0,ue.data):fe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):G?Ut&&n.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,qt,0,0,ue.width,ue.height,Kt,Vt,ue.data):n.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,qt,ce,ue.width,ue.height,0,Kt,Vt,ue.data)}}}else{if(Et=E.mipmaps,G&&Bt){Et.length>0&&Lt++;const gt=kt(At[0]);n.texStorage2D(r.TEXTURE_CUBE_MAP,Lt,ce,gt.width,gt.height)}for(let gt=0;gt<6;gt++)if(Mt){G?Ut&&n.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,0,0,At[gt].width,At[gt].height,Kt,Vt,At[gt].data):n.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,ce,At[gt].width,At[gt].height,0,Kt,Vt,At[gt].data);for(let qt=0;qt<Et.length;qt++){const He=Et[qt].image[gt].image;G?Ut&&n.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,qt+1,0,0,He.width,He.height,Kt,Vt,He.data):n.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,qt+1,ce,He.width,He.height,0,Kt,Vt,He.data)}}else{G?Ut&&n.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,0,0,Kt,Vt,At[gt]):n.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,ce,Kt,Vt,At[gt]);for(let qt=0;qt<Et.length;qt++){const ue=Et[qt];G?Ut&&n.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,qt+1,0,0,Kt,Vt,ue.image[gt]):n.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+gt,qt+1,ce,Kt,Vt,ue.image[gt])}}}M(E)&&y(r.TEXTURE_CUBE_MAP),ot.__version=St.version,E.onUpdate&&E.onUpdate(E)}U.__version=E.version}function Ot(U,E,K,ft,St,ot){const $t=c.convert(K.format,K.colorSpace),zt=c.convert(K.type),ee=w(K.internalFormat,$t,zt,K.colorSpace),Qt=s.get(E),Mt=s.get(K);if(Mt.__renderTarget=E,!Qt.__hasExternalTextures){const At=Math.max(1,E.width>>ot),te=Math.max(1,E.height>>ot);St===r.TEXTURE_3D||St===r.TEXTURE_2D_ARRAY?n.texImage3D(St,ot,ee,At,te,E.depth,0,$t,zt,null):n.texImage2D(St,ot,ee,At,te,0,$t,zt,null)}n.bindFramebuffer(r.FRAMEBUFFER,U),Tt(E)?d.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,ft,St,Mt.__webglTexture,0,Dt(E)):(St===r.TEXTURE_2D||St>=r.TEXTURE_CUBE_MAP_POSITIVE_X&&St<=r.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&r.framebufferTexture2D(r.FRAMEBUFFER,ft,St,Mt.__webglTexture,ot),n.bindFramebuffer(r.FRAMEBUFFER,null)}function Ht(U,E,K){if(r.bindRenderbuffer(r.RENDERBUFFER,U),E.depthBuffer){const ft=E.depthTexture,St=ft&&ft.isDepthTexture?ft.type:null,ot=O(E.stencilBuffer,St),$t=E.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,zt=Dt(E);Tt(E)?d.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,zt,ot,E.width,E.height):K?r.renderbufferStorageMultisample(r.RENDERBUFFER,zt,ot,E.width,E.height):r.renderbufferStorage(r.RENDERBUFFER,ot,E.width,E.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,$t,r.RENDERBUFFER,U)}else{const ft=E.textures;for(let St=0;St<ft.length;St++){const ot=ft[St],$t=c.convert(ot.format,ot.colorSpace),zt=c.convert(ot.type),ee=w(ot.internalFormat,$t,zt,ot.colorSpace),Qt=Dt(E);K&&Tt(E)===!1?r.renderbufferStorageMultisample(r.RENDERBUFFER,Qt,ee,E.width,E.height):Tt(E)?d.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Qt,ee,E.width,E.height):r.renderbufferStorage(r.RENDERBUFFER,ee,E.width,E.height)}}r.bindRenderbuffer(r.RENDERBUFFER,null)}function Zt(U,E){if(E&&E.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(r.FRAMEBUFFER,U),!(E.depthTexture&&E.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ft=s.get(E.depthTexture);ft.__renderTarget=E,(!ft.__webglTexture||E.depthTexture.image.width!==E.width||E.depthTexture.image.height!==E.height)&&(E.depthTexture.image.width=E.width,E.depthTexture.image.height=E.height,E.depthTexture.needsUpdate=!0),lt(E.depthTexture,0);const St=ft.__webglTexture,ot=Dt(E);if(E.depthTexture.format===tl)Tt(E)?d.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,St,0,ot):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,St,0);else if(E.depthTexture.format===el)Tt(E)?d.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,St,0,ot):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,St,0);else throw new Error("Unknown depthTexture format")}function pe(U){const E=s.get(U),K=U.isWebGLCubeRenderTarget===!0;if(E.__boundDepthTexture!==U.depthTexture){const ft=U.depthTexture;if(E.__depthDisposeCallback&&E.__depthDisposeCallback(),ft){const St=()=>{delete E.__boundDepthTexture,delete E.__depthDisposeCallback,ft.removeEventListener("dispose",St)};ft.addEventListener("dispose",St),E.__depthDisposeCallback=St}E.__boundDepthTexture=ft}if(U.depthTexture&&!E.__autoAllocateDepthBuffer){if(K)throw new Error("target.depthTexture not supported in Cube render targets");const ft=U.texture.mipmaps;ft&&ft.length>0?Zt(E.__webglFramebuffer[0],U):Zt(E.__webglFramebuffer,U)}else if(K){E.__webglDepthbuffer=[];for(let ft=0;ft<6;ft++)if(n.bindFramebuffer(r.FRAMEBUFFER,E.__webglFramebuffer[ft]),E.__webglDepthbuffer[ft]===void 0)E.__webglDepthbuffer[ft]=r.createRenderbuffer(),Ht(E.__webglDepthbuffer[ft],U,!1);else{const St=U.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,ot=E.__webglDepthbuffer[ft];r.bindRenderbuffer(r.RENDERBUFFER,ot),r.framebufferRenderbuffer(r.FRAMEBUFFER,St,r.RENDERBUFFER,ot)}}else{const ft=U.texture.mipmaps;if(ft&&ft.length>0?n.bindFramebuffer(r.FRAMEBUFFER,E.__webglFramebuffer[0]):n.bindFramebuffer(r.FRAMEBUFFER,E.__webglFramebuffer),E.__webglDepthbuffer===void 0)E.__webglDepthbuffer=r.createRenderbuffer(),Ht(E.__webglDepthbuffer,U,!1);else{const St=U.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,ot=E.__webglDepthbuffer;r.bindRenderbuffer(r.RENDERBUFFER,ot),r.framebufferRenderbuffer(r.FRAMEBUFFER,St,r.RENDERBUFFER,ot)}}n.bindFramebuffer(r.FRAMEBUFFER,null)}function Pe(U,E,K){const ft=s.get(U);E!==void 0&&Ot(ft.__webglFramebuffer,U,U.texture,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,0),K!==void 0&&pe(U)}function oe(U){const E=U.texture,K=s.get(U),ft=s.get(E);U.addEventListener("dispose",F);const St=U.textures,ot=U.isWebGLCubeRenderTarget===!0,$t=St.length>1;if($t||(ft.__webglTexture===void 0&&(ft.__webglTexture=r.createTexture()),ft.__version=E.version,f.memory.textures++),ot){K.__webglFramebuffer=[];for(let zt=0;zt<6;zt++)if(E.mipmaps&&E.mipmaps.length>0){K.__webglFramebuffer[zt]=[];for(let ee=0;ee<E.mipmaps.length;ee++)K.__webglFramebuffer[zt][ee]=r.createFramebuffer()}else K.__webglFramebuffer[zt]=r.createFramebuffer()}else{if(E.mipmaps&&E.mipmaps.length>0){K.__webglFramebuffer=[];for(let zt=0;zt<E.mipmaps.length;zt++)K.__webglFramebuffer[zt]=r.createFramebuffer()}else K.__webglFramebuffer=r.createFramebuffer();if($t)for(let zt=0,ee=St.length;zt<ee;zt++){const Qt=s.get(St[zt]);Qt.__webglTexture===void 0&&(Qt.__webglTexture=r.createTexture(),f.memory.textures++)}if(U.samples>0&&Tt(U)===!1){K.__webglMultisampledFramebuffer=r.createFramebuffer(),K.__webglColorRenderbuffer=[],n.bindFramebuffer(r.FRAMEBUFFER,K.__webglMultisampledFramebuffer);for(let zt=0;zt<St.length;zt++){const ee=St[zt];K.__webglColorRenderbuffer[zt]=r.createRenderbuffer(),r.bindRenderbuffer(r.RENDERBUFFER,K.__webglColorRenderbuffer[zt]);const Qt=c.convert(ee.format,ee.colorSpace),Mt=c.convert(ee.type),At=w(ee.internalFormat,Qt,Mt,ee.colorSpace,U.isXRRenderTarget===!0),te=Dt(U);r.renderbufferStorageMultisample(r.RENDERBUFFER,te,At,U.width,U.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+zt,r.RENDERBUFFER,K.__webglColorRenderbuffer[zt])}r.bindRenderbuffer(r.RENDERBUFFER,null),U.depthBuffer&&(K.__webglDepthRenderbuffer=r.createRenderbuffer(),Ht(K.__webglDepthRenderbuffer,U,!0)),n.bindFramebuffer(r.FRAMEBUFFER,null)}}if(ot){n.bindTexture(r.TEXTURE_CUBE_MAP,ft.__webglTexture),it(r.TEXTURE_CUBE_MAP,E);for(let zt=0;zt<6;zt++)if(E.mipmaps&&E.mipmaps.length>0)for(let ee=0;ee<E.mipmaps.length;ee++)Ot(K.__webglFramebuffer[zt][ee],U,E,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+zt,ee);else Ot(K.__webglFramebuffer[zt],U,E,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+zt,0);M(E)&&y(r.TEXTURE_CUBE_MAP),n.unbindTexture()}else if($t){for(let zt=0,ee=St.length;zt<ee;zt++){const Qt=St[zt],Mt=s.get(Qt);let At=r.TEXTURE_2D;(U.isWebGL3DRenderTarget||U.isWebGLArrayRenderTarget)&&(At=U.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),n.bindTexture(At,Mt.__webglTexture),it(At,Qt),Ot(K.__webglFramebuffer,U,Qt,r.COLOR_ATTACHMENT0+zt,At,0),M(Qt)&&y(At)}n.unbindTexture()}else{let zt=r.TEXTURE_2D;if((U.isWebGL3DRenderTarget||U.isWebGLArrayRenderTarget)&&(zt=U.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),n.bindTexture(zt,ft.__webglTexture),it(zt,E),E.mipmaps&&E.mipmaps.length>0)for(let ee=0;ee<E.mipmaps.length;ee++)Ot(K.__webglFramebuffer[ee],U,E,r.COLOR_ATTACHMENT0,zt,ee);else Ot(K.__webglFramebuffer,U,E,r.COLOR_ATTACHMENT0,zt,0);M(E)&&y(zt),n.unbindTexture()}U.depthBuffer&&pe(U)}function yt(U){const E=U.textures;for(let K=0,ft=E.length;K<ft;K++){const St=E[K];if(M(St)){const ot=z(U),$t=s.get(St).__webglTexture;n.bindTexture(ot,$t),y(ot),n.unbindTexture()}}}const L=[],bt=[];function Ct(U){if(U.samples>0){if(Tt(U)===!1){const E=U.textures,K=U.width,ft=U.height;let St=r.COLOR_BUFFER_BIT;const ot=U.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,$t=s.get(U),zt=E.length>1;if(zt)for(let Qt=0;Qt<E.length;Qt++)n.bindFramebuffer(r.FRAMEBUFFER,$t.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Qt,r.RENDERBUFFER,null),n.bindFramebuffer(r.FRAMEBUFFER,$t.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Qt,r.TEXTURE_2D,null,0);n.bindFramebuffer(r.READ_FRAMEBUFFER,$t.__webglMultisampledFramebuffer);const ee=U.texture.mipmaps;ee&&ee.length>0?n.bindFramebuffer(r.DRAW_FRAMEBUFFER,$t.__webglFramebuffer[0]):n.bindFramebuffer(r.DRAW_FRAMEBUFFER,$t.__webglFramebuffer);for(let Qt=0;Qt<E.length;Qt++){if(U.resolveDepthBuffer&&(U.depthBuffer&&(St|=r.DEPTH_BUFFER_BIT),U.stencilBuffer&&U.resolveStencilBuffer&&(St|=r.STENCIL_BUFFER_BIT)),zt){r.framebufferRenderbuffer(r.READ_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.RENDERBUFFER,$t.__webglColorRenderbuffer[Qt]);const Mt=s.get(E[Qt]).__webglTexture;r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,Mt,0)}r.blitFramebuffer(0,0,K,ft,0,0,K,ft,St,r.NEAREST),m===!0&&(L.length=0,bt.length=0,L.push(r.COLOR_ATTACHMENT0+Qt),U.depthBuffer&&U.resolveDepthBuffer===!1&&(L.push(ot),bt.push(ot),r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,bt)),r.invalidateFramebuffer(r.READ_FRAMEBUFFER,L))}if(n.bindFramebuffer(r.READ_FRAMEBUFFER,null),n.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),zt)for(let Qt=0;Qt<E.length;Qt++){n.bindFramebuffer(r.FRAMEBUFFER,$t.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Qt,r.RENDERBUFFER,$t.__webglColorRenderbuffer[Qt]);const Mt=s.get(E[Qt]).__webglTexture;n.bindFramebuffer(r.FRAMEBUFFER,$t.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Qt,r.TEXTURE_2D,Mt,0)}n.bindFramebuffer(r.DRAW_FRAMEBUFFER,$t.__webglMultisampledFramebuffer)}else if(U.depthBuffer&&U.resolveDepthBuffer===!1&&m){const E=U.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,[E])}}}function Dt(U){return Math.min(l.maxSamples,U.samples)}function Tt(U){const E=s.get(U);return U.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&E.__useRenderToTexture!==!1}function Wt(U){const E=f.render.frame;x.get(U)!==E&&(x.set(U,E),U.update())}function Pt(U,E){const K=U.colorSpace,ft=U.format,St=U.type;return U.isCompressedTexture===!0||U.isVideoTexture===!0||K!==zr&&K!==$a&&(Oe.getTransfer(K)===Xe?(ft!==Ci||St!==Fi)&&fe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):an("WebGLTextures: Unsupported texture color space:",K)),E}function kt(U){return typeof HTMLImageElement<"u"&&U instanceof HTMLImageElement?(p.width=U.naturalWidth||U.width,p.height=U.naturalHeight||U.height):typeof VideoFrame<"u"&&U instanceof VideoFrame?(p.width=U.displayWidth,p.height=U.displayHeight):(p.width=U.width,p.height=U.height),p}this.allocateTextureUnit=ct,this.resetTextureUnits=nt,this.setTexture2D=lt,this.setTexture2DArray=B,this.setTexture3D=q,this.setTextureCube=j,this.rebindTextures=Pe,this.setupRenderTarget=oe,this.updateRenderTargetMipmap=yt,this.updateMultisampleRenderTarget=Ct,this.setupDepthRenderbuffer=pe,this.setupFrameBufferTexture=Ot,this.useMultisampledRTT=Tt}function oA(r,t){function n(s,l=$a){let c;const f=Oe.getTransfer(l);if(s===Fi)return r.UNSIGNED_BYTE;if(s===ap)return r.UNSIGNED_SHORT_4_4_4_4;if(s===sp)return r.UNSIGNED_SHORT_5_5_5_1;if(s===b_)return r.UNSIGNED_INT_5_9_9_9_REV;if(s===E_)return r.UNSIGNED_INT_10F_11F_11F_REV;if(s===S_)return r.BYTE;if(s===M_)return r.SHORT;if(s===Jo)return r.UNSIGNED_SHORT;if(s===ip)return r.INT;if(s===Ls)return r.UNSIGNED_INT;if(s===ga)return r.FLOAT;if(s===Ir)return r.HALF_FLOAT;if(s===T_)return r.ALPHA;if(s===A_)return r.RGB;if(s===Ci)return r.RGBA;if(s===tl)return r.DEPTH_COMPONENT;if(s===el)return r.DEPTH_STENCIL;if(s===R_)return r.RED;if(s===rp)return r.RED_INTEGER;if(s===op)return r.RG;if(s===lp)return r.RG_INTEGER;if(s===cp)return r.RGBA_INTEGER;if(s===jc||s===Zc||s===Kc||s===Qc)if(f===Xe)if(c=t.get("WEBGL_compressed_texture_s3tc_srgb"),c!==null){if(s===jc)return c.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===Zc)return c.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===Kc)return c.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===Qc)return c.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(c=t.get("WEBGL_compressed_texture_s3tc"),c!==null){if(s===jc)return c.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===Zc)return c.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===Kc)return c.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===Qc)return c.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===Sd||s===Md||s===bd||s===Ed)if(c=t.get("WEBGL_compressed_texture_pvrtc"),c!==null){if(s===Sd)return c.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===Md)return c.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===bd)return c.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===Ed)return c.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===Td||s===Ad||s===Rd)if(c=t.get("WEBGL_compressed_texture_etc"),c!==null){if(s===Td||s===Ad)return f===Xe?c.COMPRESSED_SRGB8_ETC2:c.COMPRESSED_RGB8_ETC2;if(s===Rd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:c.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===Cd||s===wd||s===Dd||s===Ud||s===Ld||s===Nd||s===Od||s===Pd||s===zd||s===Bd||s===Fd||s===Id||s===Hd||s===Gd)if(c=t.get("WEBGL_compressed_texture_astc"),c!==null){if(s===Cd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:c.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===wd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:c.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===Dd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:c.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===Ud)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:c.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===Ld)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:c.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===Nd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:c.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===Od)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:c.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===Pd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:c.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===zd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:c.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===Bd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:c.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===Fd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:c.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===Id)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:c.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===Hd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:c.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===Gd)return f===Xe?c.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:c.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===Vd||s===kd||s===Xd)if(c=t.get("EXT_texture_compression_bptc"),c!==null){if(s===Vd)return f===Xe?c.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:c.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(s===kd)return c.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(s===Xd)return c.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(s===Wd||s===qd||s===Yd||s===jd)if(c=t.get("EXT_texture_compression_rgtc"),c!==null){if(s===Wd)return c.COMPRESSED_RED_RGTC1_EXT;if(s===qd)return c.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(s===Yd)return c.COMPRESSED_RED_GREEN_RGTC2_EXT;if(s===jd)return c.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return s===$o?r.UNSIGNED_INT_24_8:r[s]!==void 0?r[s]:null}return{convert:n}}const lA=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,cA=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class uA{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,n){if(this.texture===null){const s=new G_(t.texture);(t.depthNear!==n.depthNear||t.depthFar!==n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=s}}getMesh(t){if(this.texture!==null&&this.mesh===null){const n=t.cameras[0].viewport,s=new ya({vertexShader:lA,fragmentShader:cA,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new Hi(new uu(20,20),s)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class fA extends Ps{constructor(t,n){super();const s=this;let l=null,c=1,f=null,d="local-floor",m=1,p=null,x=null,g=null,_=null,S=null,b=null;const A=typeof XRWebGLBinding<"u",M=new uA,y={},z=n.getContextAttributes();let w=null,O=null;const k=[],P=[],F=new Nt;let Q=null;const D=new _i;D.viewport=new sn;const C=new _i;C.viewport=new sn;const H=[D,C],nt=new Rb;let ct=null,pt=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(at){let ut=k[at];return ut===void 0&&(ut=new jh,k[at]=ut),ut.getTargetRaySpace()},this.getControllerGrip=function(at){let ut=k[at];return ut===void 0&&(ut=new jh,k[at]=ut),ut.getGripSpace()},this.getHand=function(at){let ut=k[at];return ut===void 0&&(ut=new jh,k[at]=ut),ut.getHandSpace()};function lt(at){const ut=P.indexOf(at.inputSource);if(ut===-1)return;const Ot=k[ut];Ot!==void 0&&(Ot.update(at.inputSource,at.frame,p||f),Ot.dispatchEvent({type:at.type,data:at.inputSource}))}function B(){l.removeEventListener("select",lt),l.removeEventListener("selectstart",lt),l.removeEventListener("selectend",lt),l.removeEventListener("squeeze",lt),l.removeEventListener("squeezestart",lt),l.removeEventListener("squeezeend",lt),l.removeEventListener("end",B),l.removeEventListener("inputsourceschange",q);for(let at=0;at<k.length;at++){const ut=P[at];ut!==null&&(P[at]=null,k[at].disconnect(ut))}ct=null,pt=null,M.reset();for(const at in y)delete y[at];t.setRenderTarget(w),S=null,_=null,g=null,l=null,O=null,Gt.stop(),s.isPresenting=!1,t.setPixelRatio(Q),t.setSize(F.width,F.height,!1),s.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(at){c=at,s.isPresenting===!0&&fe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(at){d=at,s.isPresenting===!0&&fe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return p||f},this.setReferenceSpace=function(at){p=at},this.getBaseLayer=function(){return _!==null?_:S},this.getBinding=function(){return g===null&&A&&(g=new XRWebGLBinding(l,n)),g},this.getFrame=function(){return b},this.getSession=function(){return l},this.setSession=async function(at){if(l=at,l!==null){if(w=t.getRenderTarget(),l.addEventListener("select",lt),l.addEventListener("selectstart",lt),l.addEventListener("selectend",lt),l.addEventListener("squeeze",lt),l.addEventListener("squeezestart",lt),l.addEventListener("squeezeend",lt),l.addEventListener("end",B),l.addEventListener("inputsourceschange",q),z.xrCompatible!==!0&&await n.makeXRCompatible(),Q=t.getPixelRatio(),t.getSize(F),A&&"createProjectionLayer"in XRWebGLBinding.prototype){let Ot=null,Ht=null,Zt=null;z.depth&&(Zt=z.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,Ot=z.stencil?el:tl,Ht=z.stencil?$o:Ls);const pe={colorFormat:n.RGBA8,depthFormat:Zt,scaleFactor:c};g=this.getBinding(),_=g.createProjectionLayer(pe),l.updateRenderState({layers:[_]}),t.setPixelRatio(1),t.setSize(_.textureWidth,_.textureHeight,!1),O=new Ns(_.textureWidth,_.textureHeight,{format:Ci,type:Fi,depthTexture:new H_(_.textureWidth,_.textureHeight,Ht,void 0,void 0,void 0,void 0,void 0,void 0,Ot),stencilBuffer:z.stencil,colorSpace:t.outputColorSpace,samples:z.antialias?4:0,resolveDepthBuffer:_.ignoreDepthValues===!1,resolveStencilBuffer:_.ignoreDepthValues===!1})}else{const Ot={antialias:z.antialias,alpha:!0,depth:z.depth,stencil:z.stencil,framebufferScaleFactor:c};S=new XRWebGLLayer(l,n,Ot),l.updateRenderState({baseLayer:S}),t.setPixelRatio(1),t.setSize(S.framebufferWidth,S.framebufferHeight,!1),O=new Ns(S.framebufferWidth,S.framebufferHeight,{format:Ci,type:Fi,colorSpace:t.outputColorSpace,stencilBuffer:z.stencil,resolveDepthBuffer:S.ignoreDepthValues===!1,resolveStencilBuffer:S.ignoreDepthValues===!1})}O.isXRRenderTarget=!0,this.setFoveation(m),p=null,f=await l.requestReferenceSpace(d),Gt.setContext(l),Gt.start(),s.isPresenting=!0,s.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(l!==null)return l.environmentBlendMode},this.getDepthTexture=function(){return M.getDepthTexture()};function q(at){for(let ut=0;ut<at.removed.length;ut++){const Ot=at.removed[ut],Ht=P.indexOf(Ot);Ht>=0&&(P[Ht]=null,k[Ht].disconnect(Ot))}for(let ut=0;ut<at.added.length;ut++){const Ot=at.added[ut];let Ht=P.indexOf(Ot);if(Ht===-1){for(let pe=0;pe<k.length;pe++)if(pe>=P.length){P.push(Ot),Ht=pe;break}else if(P[pe]===null){P[pe]=Ot,Ht=pe;break}if(Ht===-1)break}const Zt=k[Ht];Zt&&Zt.connect(Ot)}}const j=new Y,xt=new Y;function vt(at,ut,Ot){j.setFromMatrixPosition(ut.matrixWorld),xt.setFromMatrixPosition(Ot.matrixWorld);const Ht=j.distanceTo(xt),Zt=ut.projectionMatrix.elements,pe=Ot.projectionMatrix.elements,Pe=Zt[14]/(Zt[10]-1),oe=Zt[14]/(Zt[10]+1),yt=(Zt[9]+1)/Zt[5],L=(Zt[9]-1)/Zt[5],bt=(Zt[8]-1)/Zt[0],Ct=(pe[8]+1)/pe[0],Dt=Pe*bt,Tt=Pe*Ct,Wt=Ht/(-bt+Ct),Pt=Wt*-bt;if(ut.matrixWorld.decompose(at.position,at.quaternion,at.scale),at.translateX(Pt),at.translateZ(Wt),at.matrixWorld.compose(at.position,at.quaternion,at.scale),at.matrixWorldInverse.copy(at.matrixWorld).invert(),Zt[10]===-1)at.projectionMatrix.copy(ut.projectionMatrix),at.projectionMatrixInverse.copy(ut.projectionMatrixInverse);else{const kt=Pe+Wt,U=oe+Wt,E=Dt-Pt,K=Tt+(Ht-Pt),ft=yt*oe/U*kt,St=L*oe/U*kt;at.projectionMatrix.makePerspective(E,K,ft,St,kt,U),at.projectionMatrixInverse.copy(at.projectionMatrix).invert()}}function N(at,ut){ut===null?at.matrixWorld.copy(at.matrix):at.matrixWorld.multiplyMatrices(ut.matrixWorld,at.matrix),at.matrixWorldInverse.copy(at.matrixWorld).invert()}this.updateCamera=function(at){if(l===null)return;let ut=at.near,Ot=at.far;M.texture!==null&&(M.depthNear>0&&(ut=M.depthNear),M.depthFar>0&&(Ot=M.depthFar)),nt.near=C.near=D.near=ut,nt.far=C.far=D.far=Ot,(ct!==nt.near||pt!==nt.far)&&(l.updateRenderState({depthNear:nt.near,depthFar:nt.far}),ct=nt.near,pt=nt.far),nt.layers.mask=at.layers.mask|6,D.layers.mask=nt.layers.mask&3,C.layers.mask=nt.layers.mask&5;const Ht=at.parent,Zt=nt.cameras;N(nt,Ht);for(let pe=0;pe<Zt.length;pe++)N(Zt[pe],Ht);Zt.length===2?vt(nt,D,C):nt.projectionMatrix.copy(D.projectionMatrix),it(at,nt,Ht)};function it(at,ut,Ot){Ot===null?at.matrix.copy(ut.matrixWorld):(at.matrix.copy(Ot.matrixWorld),at.matrix.invert(),at.matrix.multiply(ut.matrixWorld)),at.matrix.decompose(at.position,at.quaternion,at.scale),at.updateMatrixWorld(!0),at.projectionMatrix.copy(ut.projectionMatrix),at.projectionMatrixInverse.copy(ut.projectionMatrixInverse),at.isPerspectiveCamera&&(at.fov=Zd*2*Math.atan(1/at.projectionMatrix.elements[5]),at.zoom=1)}this.getCamera=function(){return nt},this.getFoveation=function(){if(!(_===null&&S===null))return m},this.setFoveation=function(at){m=at,_!==null&&(_.fixedFoveation=at),S!==null&&S.fixedFoveation!==void 0&&(S.fixedFoveation=at)},this.hasDepthSensing=function(){return M.texture!==null},this.getDepthSensingMesh=function(){return M.getMesh(nt)},this.getCameraTexture=function(at){return y[at]};let _t=null;function Rt(at,ut){if(x=ut.getViewerPose(p||f),b=ut,x!==null){const Ot=x.views;S!==null&&(t.setRenderTargetFramebuffer(O,S.framebuffer),t.setRenderTarget(O));let Ht=!1;Ot.length!==nt.cameras.length&&(nt.cameras.length=0,Ht=!0);for(let oe=0;oe<Ot.length;oe++){const yt=Ot[oe];let L=null;if(S!==null)L=S.getViewport(yt);else{const Ct=g.getViewSubImage(_,yt);L=Ct.viewport,oe===0&&(t.setRenderTargetTextures(O,Ct.colorTexture,Ct.depthStencilTexture),t.setRenderTarget(O))}let bt=H[oe];bt===void 0&&(bt=new _i,bt.layers.enable(oe),bt.viewport=new sn,H[oe]=bt),bt.matrix.fromArray(yt.transform.matrix),bt.matrix.decompose(bt.position,bt.quaternion,bt.scale),bt.projectionMatrix.fromArray(yt.projectionMatrix),bt.projectionMatrixInverse.copy(bt.projectionMatrix).invert(),bt.viewport.set(L.x,L.y,L.width,L.height),oe===0&&(nt.matrix.copy(bt.matrix),nt.matrix.decompose(nt.position,nt.quaternion,nt.scale)),Ht===!0&&nt.cameras.push(bt)}const Zt=l.enabledFeatures;if(Zt&&Zt.includes("depth-sensing")&&l.depthUsage=="gpu-optimized"&&A){g=s.getBinding();const oe=g.getDepthInformation(Ot[0]);oe&&oe.isValid&&oe.texture&&M.init(oe,l.renderState)}if(Zt&&Zt.includes("camera-access")&&A){t.state.unbindTexture(),g=s.getBinding();for(let oe=0;oe<Ot.length;oe++){const yt=Ot[oe].camera;if(yt){let L=y[yt];L||(L=new G_,y[yt]=L);const bt=g.getCameraImage(yt);L.sourceTexture=bt}}}}for(let Ot=0;Ot<k.length;Ot++){const Ht=P[Ot],Zt=k[Ot];Ht!==null&&Zt!==void 0&&Zt.update(Ht,ut,p||f)}_t&&_t(at,ut),ut.detectedPlanes&&s.dispatchEvent({type:"planesdetected",data:ut}),b=null}const Gt=new $_;Gt.setAnimationLoop(Rt),this.setAnimationLoop=function(at){_t=at},this.dispose=function(){}}}const Rs=new Ii,hA=new tn;function dA(r,t){function n(M,y){M.matrixAutoUpdate===!0&&M.updateMatrix(),y.value.copy(M.matrix)}function s(M,y){y.color.getRGB(M.fogColor.value,B_(r)),y.isFog?(M.fogNear.value=y.near,M.fogFar.value=y.far):y.isFogExp2&&(M.fogDensity.value=y.density)}function l(M,y,z,w,O){y.isMeshBasicMaterial||y.isMeshLambertMaterial?c(M,y):y.isMeshToonMaterial?(c(M,y),g(M,y)):y.isMeshPhongMaterial?(c(M,y),x(M,y)):y.isMeshStandardMaterial?(c(M,y),_(M,y),y.isMeshPhysicalMaterial&&S(M,y,O)):y.isMeshMatcapMaterial?(c(M,y),b(M,y)):y.isMeshDepthMaterial?c(M,y):y.isMeshDistanceMaterial?(c(M,y),A(M,y)):y.isMeshNormalMaterial?c(M,y):y.isLineBasicMaterial?(f(M,y),y.isLineDashedMaterial&&d(M,y)):y.isPointsMaterial?m(M,y,z,w):y.isSpriteMaterial?p(M,y):y.isShadowMaterial?(M.color.value.copy(y.color),M.opacity.value=y.opacity):y.isShaderMaterial&&(y.uniformsNeedUpdate=!1)}function c(M,y){M.opacity.value=y.opacity,y.color&&M.diffuse.value.copy(y.color),y.emissive&&M.emissive.value.copy(y.emissive).multiplyScalar(y.emissiveIntensity),y.map&&(M.map.value=y.map,n(y.map,M.mapTransform)),y.alphaMap&&(M.alphaMap.value=y.alphaMap,n(y.alphaMap,M.alphaMapTransform)),y.bumpMap&&(M.bumpMap.value=y.bumpMap,n(y.bumpMap,M.bumpMapTransform),M.bumpScale.value=y.bumpScale,y.side===jn&&(M.bumpScale.value*=-1)),y.normalMap&&(M.normalMap.value=y.normalMap,n(y.normalMap,M.normalMapTransform),M.normalScale.value.copy(y.normalScale),y.side===jn&&M.normalScale.value.negate()),y.displacementMap&&(M.displacementMap.value=y.displacementMap,n(y.displacementMap,M.displacementMapTransform),M.displacementScale.value=y.displacementScale,M.displacementBias.value=y.displacementBias),y.emissiveMap&&(M.emissiveMap.value=y.emissiveMap,n(y.emissiveMap,M.emissiveMapTransform)),y.specularMap&&(M.specularMap.value=y.specularMap,n(y.specularMap,M.specularMapTransform)),y.alphaTest>0&&(M.alphaTest.value=y.alphaTest);const z=t.get(y),w=z.envMap,O=z.envMapRotation;w&&(M.envMap.value=w,Rs.copy(O),Rs.x*=-1,Rs.y*=-1,Rs.z*=-1,w.isCubeTexture&&w.isRenderTargetTexture===!1&&(Rs.y*=-1,Rs.z*=-1),M.envMapRotation.value.setFromMatrix4(hA.makeRotationFromEuler(Rs)),M.flipEnvMap.value=w.isCubeTexture&&w.isRenderTargetTexture===!1?-1:1,M.reflectivity.value=y.reflectivity,M.ior.value=y.ior,M.refractionRatio.value=y.refractionRatio),y.lightMap&&(M.lightMap.value=y.lightMap,M.lightMapIntensity.value=y.lightMapIntensity,n(y.lightMap,M.lightMapTransform)),y.aoMap&&(M.aoMap.value=y.aoMap,M.aoMapIntensity.value=y.aoMapIntensity,n(y.aoMap,M.aoMapTransform))}function f(M,y){M.diffuse.value.copy(y.color),M.opacity.value=y.opacity,y.map&&(M.map.value=y.map,n(y.map,M.mapTransform))}function d(M,y){M.dashSize.value=y.dashSize,M.totalSize.value=y.dashSize+y.gapSize,M.scale.value=y.scale}function m(M,y,z,w){M.diffuse.value.copy(y.color),M.opacity.value=y.opacity,M.size.value=y.size*z,M.scale.value=w*.5,y.map&&(M.map.value=y.map,n(y.map,M.uvTransform)),y.alphaMap&&(M.alphaMap.value=y.alphaMap,n(y.alphaMap,M.alphaMapTransform)),y.alphaTest>0&&(M.alphaTest.value=y.alphaTest)}function p(M,y){M.diffuse.value.copy(y.color),M.opacity.value=y.opacity,M.rotation.value=y.rotation,y.map&&(M.map.value=y.map,n(y.map,M.mapTransform)),y.alphaMap&&(M.alphaMap.value=y.alphaMap,n(y.alphaMap,M.alphaMapTransform)),y.alphaTest>0&&(M.alphaTest.value=y.alphaTest)}function x(M,y){M.specular.value.copy(y.specular),M.shininess.value=Math.max(y.shininess,1e-4)}function g(M,y){y.gradientMap&&(M.gradientMap.value=y.gradientMap)}function _(M,y){M.metalness.value=y.metalness,y.metalnessMap&&(M.metalnessMap.value=y.metalnessMap,n(y.metalnessMap,M.metalnessMapTransform)),M.roughness.value=y.roughness,y.roughnessMap&&(M.roughnessMap.value=y.roughnessMap,n(y.roughnessMap,M.roughnessMapTransform)),y.envMap&&(M.envMapIntensity.value=y.envMapIntensity)}function S(M,y,z){M.ior.value=y.ior,y.sheen>0&&(M.sheenColor.value.copy(y.sheenColor).multiplyScalar(y.sheen),M.sheenRoughness.value=y.sheenRoughness,y.sheenColorMap&&(M.sheenColorMap.value=y.sheenColorMap,n(y.sheenColorMap,M.sheenColorMapTransform)),y.sheenRoughnessMap&&(M.sheenRoughnessMap.value=y.sheenRoughnessMap,n(y.sheenRoughnessMap,M.sheenRoughnessMapTransform))),y.clearcoat>0&&(M.clearcoat.value=y.clearcoat,M.clearcoatRoughness.value=y.clearcoatRoughness,y.clearcoatMap&&(M.clearcoatMap.value=y.clearcoatMap,n(y.clearcoatMap,M.clearcoatMapTransform)),y.clearcoatRoughnessMap&&(M.clearcoatRoughnessMap.value=y.clearcoatRoughnessMap,n(y.clearcoatRoughnessMap,M.clearcoatRoughnessMapTransform)),y.clearcoatNormalMap&&(M.clearcoatNormalMap.value=y.clearcoatNormalMap,n(y.clearcoatNormalMap,M.clearcoatNormalMapTransform),M.clearcoatNormalScale.value.copy(y.clearcoatNormalScale),y.side===jn&&M.clearcoatNormalScale.value.negate())),y.dispersion>0&&(M.dispersion.value=y.dispersion),y.iridescence>0&&(M.iridescence.value=y.iridescence,M.iridescenceIOR.value=y.iridescenceIOR,M.iridescenceThicknessMinimum.value=y.iridescenceThicknessRange[0],M.iridescenceThicknessMaximum.value=y.iridescenceThicknessRange[1],y.iridescenceMap&&(M.iridescenceMap.value=y.iridescenceMap,n(y.iridescenceMap,M.iridescenceMapTransform)),y.iridescenceThicknessMap&&(M.iridescenceThicknessMap.value=y.iridescenceThicknessMap,n(y.iridescenceThicknessMap,M.iridescenceThicknessMapTransform))),y.transmission>0&&(M.transmission.value=y.transmission,M.transmissionSamplerMap.value=z.texture,M.transmissionSamplerSize.value.set(z.width,z.height),y.transmissionMap&&(M.transmissionMap.value=y.transmissionMap,n(y.transmissionMap,M.transmissionMapTransform)),M.thickness.value=y.thickness,y.thicknessMap&&(M.thicknessMap.value=y.thicknessMap,n(y.thicknessMap,M.thicknessMapTransform)),M.attenuationDistance.value=y.attenuationDistance,M.attenuationColor.value.copy(y.attenuationColor)),y.anisotropy>0&&(M.anisotropyVector.value.set(y.anisotropy*Math.cos(y.anisotropyRotation),y.anisotropy*Math.sin(y.anisotropyRotation)),y.anisotropyMap&&(M.anisotropyMap.value=y.anisotropyMap,n(y.anisotropyMap,M.anisotropyMapTransform))),M.specularIntensity.value=y.specularIntensity,M.specularColor.value.copy(y.specularColor),y.specularColorMap&&(M.specularColorMap.value=y.specularColorMap,n(y.specularColorMap,M.specularColorMapTransform)),y.specularIntensityMap&&(M.specularIntensityMap.value=y.specularIntensityMap,n(y.specularIntensityMap,M.specularIntensityMapTransform))}function b(M,y){y.matcap&&(M.matcap.value=y.matcap)}function A(M,y){const z=t.get(y).light;M.referencePosition.value.setFromMatrixPosition(z.matrixWorld),M.nearDistance.value=z.shadow.camera.near,M.farDistance.value=z.shadow.camera.far}return{refreshFogUniforms:s,refreshMaterialUniforms:l}}function pA(r,t,n,s){let l={},c={},f=[];const d=r.getParameter(r.MAX_UNIFORM_BUFFER_BINDINGS);function m(z,w){const O=w.program;s.uniformBlockBinding(z,O)}function p(z,w){let O=l[z.id];O===void 0&&(b(z),O=x(z),l[z.id]=O,z.addEventListener("dispose",M));const k=w.program;s.updateUBOMapping(z,k);const P=t.render.frame;c[z.id]!==P&&(_(z),c[z.id]=P)}function x(z){const w=g();z.__bindingPointIndex=w;const O=r.createBuffer(),k=z.__size,P=z.usage;return r.bindBuffer(r.UNIFORM_BUFFER,O),r.bufferData(r.UNIFORM_BUFFER,k,P),r.bindBuffer(r.UNIFORM_BUFFER,null),r.bindBufferBase(r.UNIFORM_BUFFER,w,O),O}function g(){for(let z=0;z<d;z++)if(f.indexOf(z)===-1)return f.push(z),z;return an("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function _(z){const w=l[z.id],O=z.uniforms,k=z.__cache;r.bindBuffer(r.UNIFORM_BUFFER,w);for(let P=0,F=O.length;P<F;P++){const Q=Array.isArray(O[P])?O[P]:[O[P]];for(let D=0,C=Q.length;D<C;D++){const H=Q[D];if(S(H,P,D,k)===!0){const nt=H.__offset,ct=Array.isArray(H.value)?H.value:[H.value];let pt=0;for(let lt=0;lt<ct.length;lt++){const B=ct[lt],q=A(B);typeof B=="number"||typeof B=="boolean"?(H.__data[0]=B,r.bufferSubData(r.UNIFORM_BUFFER,nt+pt,H.__data)):B.isMatrix3?(H.__data[0]=B.elements[0],H.__data[1]=B.elements[1],H.__data[2]=B.elements[2],H.__data[3]=0,H.__data[4]=B.elements[3],H.__data[5]=B.elements[4],H.__data[6]=B.elements[5],H.__data[7]=0,H.__data[8]=B.elements[6],H.__data[9]=B.elements[7],H.__data[10]=B.elements[8],H.__data[11]=0):(B.toArray(H.__data,pt),pt+=q.storage/Float32Array.BYTES_PER_ELEMENT)}r.bufferSubData(r.UNIFORM_BUFFER,nt,H.__data)}}}r.bindBuffer(r.UNIFORM_BUFFER,null)}function S(z,w,O,k){const P=z.value,F=w+"_"+O;if(k[F]===void 0)return typeof P=="number"||typeof P=="boolean"?k[F]=P:k[F]=P.clone(),!0;{const Q=k[F];if(typeof P=="number"||typeof P=="boolean"){if(Q!==P)return k[F]=P,!0}else if(Q.equals(P)===!1)return Q.copy(P),!0}return!1}function b(z){const w=z.uniforms;let O=0;const k=16;for(let F=0,Q=w.length;F<Q;F++){const D=Array.isArray(w[F])?w[F]:[w[F]];for(let C=0,H=D.length;C<H;C++){const nt=D[C],ct=Array.isArray(nt.value)?nt.value:[nt.value];for(let pt=0,lt=ct.length;pt<lt;pt++){const B=ct[pt],q=A(B),j=O%k,xt=j%q.boundary,vt=j+xt;O+=xt,vt!==0&&k-vt<q.storage&&(O+=k-vt),nt.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),nt.__offset=O,O+=q.storage}}}const P=O%k;return P>0&&(O+=k-P),z.__size=O,z.__cache={},this}function A(z){const w={boundary:0,storage:0};return typeof z=="number"||typeof z=="boolean"?(w.boundary=4,w.storage=4):z.isVector2?(w.boundary=8,w.storage=8):z.isVector3||z.isColor?(w.boundary=16,w.storage=12):z.isVector4?(w.boundary=16,w.storage=16):z.isMatrix3?(w.boundary=48,w.storage=48):z.isMatrix4?(w.boundary=64,w.storage=64):z.isTexture?fe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):fe("WebGLRenderer: Unsupported uniform value type.",z),w}function M(z){const w=z.target;w.removeEventListener("dispose",M);const O=f.indexOf(w.__bindingPointIndex);f.splice(O,1),r.deleteBuffer(l[w.id]),delete l[w.id],delete c[w.id]}function y(){for(const z in l)r.deleteBuffer(l[z]);f=[],l={},c={}}return{bind:m,update:p,dispose:y}}const mA=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let da=null;function xA(){return da===null&&(da=new zM(mA,32,32,op,Ir),da.minFilter=yi,da.magFilter=yi,da.wrapS=xa,da.wrapT=xa,da.generateMipmaps=!1,da.needsUpdate=!0),da}class gA{constructor(t={}){const{canvas:n=oM(),context:s=null,depth:l=!0,stencil:c=!1,alpha:f=!1,antialias:d=!1,premultipliedAlpha:m=!0,preserveDrawingBuffer:p=!1,powerPreference:x="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:_=!1}=t;this.isWebGLRenderer=!0;let S;if(s!==null){if(typeof WebGLRenderingContext<"u"&&s instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");S=s.getContextAttributes().alpha}else S=f;const b=new Set([cp,lp,rp]),A=new Set([Fi,Ls,Jo,$o,ap,sp]),M=new Uint32Array(4),y=new Int32Array(4);let z=null,w=null;const O=[],k=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=es,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const P=this;let F=!1;this._outputColorSpace=gi;let Q=0,D=0,C=null,H=-1,nt=null;const ct=new sn,pt=new sn;let lt=null;const B=new Te(0);let q=0,j=n.width,xt=n.height,vt=1,N=null,it=null;const _t=new sn(0,0,j,xt),Rt=new sn(0,0,j,xt);let Gt=!1;const at=new hp;let ut=!1,Ot=!1;const Ht=new tn,Zt=new Y,pe=new sn,Pe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let oe=!1;function yt(){return C===null?vt:1}let L=s;function bt(R,X){return n.getContext(R,X)}try{const R={alpha:!0,depth:l,stencil:c,antialias:d,premultipliedAlpha:m,preserveDrawingBuffer:p,powerPreference:x,failIfMajorPerformanceCaveat:g};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${np}`),n.addEventListener("webglcontextlost",Et,!1),n.addEventListener("webglcontextrestored",gt,!1),n.addEventListener("webglcontextcreationerror",qt,!1),L===null){const X="webgl2";if(L=bt(X,R),L===null)throw bt(X)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw R("WebGLRenderer: "+R.message),R}let Ct,Dt,Tt,Wt,Pt,kt,U,E,K,ft,St,ot,$t,zt,ee,Qt,Mt,At,te,Kt,Vt,ce,G,Bt;function Ut(){Ct=new TE(L),Ct.init(),ce=new oA(L,Ct),Dt=new xE(L,Ct,t,ce),Tt=new sA(L,Ct),Dt.reversedDepthBuffer&&_&&Tt.buffers.depth.setReversed(!0),Wt=new CE(L),Pt=new qT,kt=new rA(L,Ct,Tt,Pt,Dt,ce,Wt),U=new _E(P),E=new EE(P),K=new Lb(L),G=new pE(L,K),ft=new AE(L,K,Wt,G),St=new DE(L,ft,K,Wt),te=new wE(L,Dt,kt),Qt=new gE(Pt),ot=new WT(P,U,E,Ct,Dt,G,Qt),$t=new dA(P,Pt),zt=new jT,ee=new tA(Ct),At=new dE(P,U,E,Tt,St,S,m),Mt=new iA(P,St,Dt),Bt=new pA(L,Wt,Dt,Tt),Kt=new mE(L,Ct,Wt),Vt=new RE(L,Ct,Wt),Wt.programs=ot.programs,P.capabilities=Dt,P.extensions=Ct,P.properties=Pt,P.renderLists=zt,P.shadowMap=Mt,P.state=Tt,P.info=Wt}Ut();const Lt=new fA(P,L);this.xr=Lt,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){const R=Ct.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=Ct.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return vt},this.setPixelRatio=function(R){R!==void 0&&(vt=R,this.setSize(j,xt,!1))},this.getSize=function(R){return R.set(j,xt)},this.setSize=function(R,X,st=!0){if(Lt.isPresenting){fe("WebGLRenderer: Can't change size while VR device is presenting.");return}j=R,xt=X,n.width=Math.floor(R*vt),n.height=Math.floor(X*vt),st===!0&&(n.style.width=R+"px",n.style.height=X+"px"),this.setViewport(0,0,R,X)},this.getDrawingBufferSize=function(R){return R.set(j*vt,xt*vt).floor()},this.setDrawingBufferSize=function(R,X,st){j=R,xt=X,vt=st,n.width=Math.floor(R*st),n.height=Math.floor(X*st),this.setViewport(0,0,R,X)},this.getCurrentViewport=function(R){return R.copy(ct)},this.getViewport=function(R){return R.copy(_t)},this.setViewport=function(R,X,st,tt){R.isVector4?_t.set(R.x,R.y,R.z,R.w):_t.set(R,X,st,tt),Tt.viewport(ct.copy(_t).multiplyScalar(vt).round())},this.getScissor=function(R){return R.copy(Rt)},this.setScissor=function(R,X,st,tt){R.isVector4?Rt.set(R.x,R.y,R.z,R.w):Rt.set(R,X,st,tt),Tt.scissor(pt.copy(Rt).multiplyScalar(vt).round())},this.getScissorTest=function(){return Gt},this.setScissorTest=function(R){Tt.setScissorTest(Gt=R)},this.setOpaqueSort=function(R){N=R},this.setTransparentSort=function(R){it=R},this.getClearColor=function(R){return R.copy(At.getClearColor())},this.setClearColor=function(){At.setClearColor(...arguments)},this.getClearAlpha=function(){return At.getClearAlpha()},this.setClearAlpha=function(){At.setClearAlpha(...arguments)},this.clear=function(R=!0,X=!0,st=!0){let tt=0;if(R){let Z=!1;if(C!==null){const wt=C.texture.format;Z=b.has(wt)}if(Z){const wt=C.texture.type,Ft=A.has(wt),Xt=At.getClearColor(),Yt=At.getClearAlpha(),se=Xt.r,le=Xt.g,ne=Xt.b;Ft?(M[0]=se,M[1]=le,M[2]=ne,M[3]=Yt,L.clearBufferuiv(L.COLOR,0,M)):(y[0]=se,y[1]=le,y[2]=ne,y[3]=Yt,L.clearBufferiv(L.COLOR,0,y))}else tt|=L.COLOR_BUFFER_BIT}X&&(tt|=L.DEPTH_BUFFER_BIT),st&&(tt|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),L.clear(tt)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",Et,!1),n.removeEventListener("webglcontextrestored",gt,!1),n.removeEventListener("webglcontextcreationerror",qt,!1),At.dispose(),zt.dispose(),ee.dispose(),Pt.dispose(),U.dispose(),E.dispose(),St.dispose(),G.dispose(),Bt.dispose(),ot.dispose(),Lt.dispose(),Lt.removeEventListener("sessionstart",Xr),Lt.removeEventListener("sessionend",Wr),Si.stop()};function Et(R){R.preventDefault(),mg("WebGLRenderer: Context Lost."),F=!0}function gt(){mg("WebGLRenderer: Context Restored."),F=!1;const R=Wt.autoReset,X=Mt.enabled,st=Mt.autoUpdate,tt=Mt.needsUpdate,Z=Mt.type;Ut(),Wt.autoReset=R,Mt.enabled=X,Mt.autoUpdate=st,Mt.needsUpdate=tt,Mt.type=Z}function qt(R){an("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function ue(R){const X=R.target;X.removeEventListener("dispose",ue),He(X)}function He(R){De(R),Pt.remove(R)}function De(R){const X=Pt.get(R).programs;X!==void 0&&(X.forEach(function(st){ot.releaseProgram(st)}),R.isShaderMaterial&&ot.releaseShaderCache(R))}this.renderBufferDirect=function(R,X,st,tt,Z,wt){X===null&&(X=Pe);const Ft=Z.isMesh&&Z.matrixWorld.determinant()<0,Xt=du(R,X,st,tt,Z);Tt.setMaterial(tt,Ft);let Yt=st.index,se=1;if(tt.wireframe===!0){if(Yt=ft.getWireframeAttribute(st),Yt===void 0)return;se=2}const le=st.drawRange,ne=st.attributes.position;let xe=le.start*se,we=(le.start+le.count)*se;wt!==null&&(xe=Math.max(xe,wt.start*se),we=Math.min(we,(wt.start+wt.count)*se)),Yt!==null?(xe=Math.max(xe,0),we=Math.min(we,Yt.count)):ne!=null&&(xe=Math.max(xe,0),we=Math.min(we,ne.count));const Ue=we-xe;if(Ue<0||Ue===1/0)return;G.setup(Z,tt,Xt,st,Yt);let Ae,Be=Kt;if(Yt!==null&&(Ae=K.get(Yt),Be=Vt,Be.setIndex(Ae)),Z.isMesh)tt.wireframe===!0?(Tt.setLineWidth(tt.wireframeLinewidth*yt()),Be.setMode(L.LINES)):Be.setMode(L.TRIANGLES);else if(Z.isLine){let ae=tt.linewidth;ae===void 0&&(ae=1),Tt.setLineWidth(ae*yt()),Z.isLineSegments?Be.setMode(L.LINES):Z.isLineLoop?Be.setMode(L.LINE_LOOP):Be.setMode(L.LINE_STRIP)}else Z.isPoints?Be.setMode(L.POINTS):Z.isSprite&&Be.setMode(L.TRIANGLES);if(Z.isBatchedMesh)if(Z._multiDrawInstances!==null)nl("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),Be.renderMultiDrawInstances(Z._multiDrawStarts,Z._multiDrawCounts,Z._multiDrawCount,Z._multiDrawInstances);else if(Ct.get("WEBGL_multi_draw"))Be.renderMultiDraw(Z._multiDrawStarts,Z._multiDrawCounts,Z._multiDrawCount);else{const ae=Z._multiDrawStarts,qe=Z._multiDrawCounts,Re=Z._multiDrawCount,yn=Yt?K.get(Yt).bytesPerElement:1,Ma=Pt.get(tt).currentProgram.getUniforms();for(let je=0;je<Re;je++)Ma.setValue(L,"_gl_DrawID",je),Be.render(ae[je]/yn,qe[je])}else if(Z.isInstancedMesh)Be.renderInstances(xe,Ue,Z.count);else if(st.isInstancedBufferGeometry){const ae=st._maxInstanceCount!==void 0?st._maxInstanceCount:1/0,qe=Math.min(st.instanceCount,ae);Be.renderInstances(xe,Ue,qe)}else Be.render(xe,Ue)};function Ln(R,X,st){R.transparent===!0&&R.side===ma&&R.forceSinglePass===!1?(R.side=jn,R.needsUpdate=!0,pn(R,X,st),R.side=ns,R.needsUpdate=!0,pn(R,X,st),R.side=ma):pn(R,X,st)}this.compile=function(R,X,st=null){st===null&&(st=R),w=ee.get(st),w.init(X),k.push(w),st.traverseVisible(function(Z){Z.isLight&&Z.layers.test(X.layers)&&(w.pushLight(Z),Z.castShadow&&w.pushShadow(Z))}),R!==st&&R.traverseVisible(function(Z){Z.isLight&&Z.layers.test(X.layers)&&(w.pushLight(Z),Z.castShadow&&w.pushShadow(Z))}),w.setupLights();const tt=new Set;return R.traverse(function(Z){if(!(Z.isMesh||Z.isPoints||Z.isLine||Z.isSprite))return;const wt=Z.material;if(wt)if(Array.isArray(wt))for(let Ft=0;Ft<wt.length;Ft++){const Xt=wt[Ft];Ln(Xt,st,Z),tt.add(Xt)}else Ln(wt,st,Z),tt.add(wt)}),w=k.pop(),tt},this.compileAsync=function(R,X,st=null){const tt=this.compile(R,X,st);return new Promise(Z=>{function wt(){if(tt.forEach(function(Ft){Pt.get(Ft).currentProgram.isReady()&&tt.delete(Ft)}),tt.size===0){Z(R);return}setTimeout(wt,10)}Ct.get("KHR_parallel_shader_compile")!==null?wt():setTimeout(wt,10)})};let Kn=null;function ol(R){Kn&&Kn(R)}function Xr(){Si.stop()}function Wr(){Si.start()}const Si=new $_;Si.setAnimationLoop(ol),typeof self<"u"&&Si.setContext(self),this.setAnimationLoop=function(R){Kn=R,Lt.setAnimationLoop(R),R===null?Si.stop():Si.start()},Lt.addEventListener("sessionstart",Xr),Lt.addEventListener("sessionend",Wr),this.render=function(R,X){if(X!==void 0&&X.isCamera!==!0){an("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(F===!0)return;if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),X.parent===null&&X.matrixWorldAutoUpdate===!0&&X.updateMatrixWorld(),Lt.enabled===!0&&Lt.isPresenting===!0&&(Lt.cameraAutoUpdate===!0&&Lt.updateCamera(X),X=Lt.getCamera()),R.isScene===!0&&R.onBeforeRender(P,R,X,C),w=ee.get(R,k.length),w.init(X),k.push(w),Ht.multiplyMatrices(X.projectionMatrix,X.matrixWorldInverse),at.setFromProjectionMatrix(Ht,zi,X.reversedDepth),Ot=this.localClippingEnabled,ut=Qt.init(this.clippingPlanes,Ot),z=zt.get(R,O.length),z.init(),O.push(z),Lt.enabled===!0&&Lt.isPresenting===!0){const wt=P.xr.getDepthSensingMesh();wt!==null&&as(wt,X,-1/0,P.sortObjects)}as(R,X,0,P.sortObjects),z.finish(),P.sortObjects===!0&&z.sort(N,it),oe=Lt.enabled===!1||Lt.isPresenting===!1||Lt.hasDepthSensing()===!1,oe&&At.addToRenderList(z,R),this.info.render.frame++,ut===!0&&Qt.beginShadows();const st=w.state.shadowsArray;Mt.render(st,R,X),ut===!0&&Qt.endShadows(),this.info.autoReset===!0&&this.info.reset();const tt=z.opaque,Z=z.transmissive;if(w.setupLights(),X.isArrayCamera){const wt=X.cameras;if(Z.length>0)for(let Ft=0,Xt=wt.length;Ft<Xt;Ft++){const Yt=wt[Ft];Yr(tt,Z,R,Yt)}oe&&At.render(R);for(let Ft=0,Xt=wt.length;Ft<Xt;Ft++){const Yt=wt[Ft];qr(z,R,Yt,Yt.viewport)}}else Z.length>0&&Yr(tt,Z,R,X),oe&&At.render(R),qr(z,R,X);C!==null&&D===0&&(kt.updateMultisampleRenderTarget(C),kt.updateRenderTargetMipmap(C)),R.isScene===!0&&R.onAfterRender(P,R,X),G.resetDefaultState(),H=-1,nt=null,k.pop(),k.length>0?(w=k[k.length-1],ut===!0&&Qt.setGlobalState(P.clippingPlanes,w.state.camera)):w=null,O.pop(),O.length>0?z=O[O.length-1]:z=null};function as(R,X,st,tt){if(R.visible===!1)return;if(R.layers.test(X.layers)){if(R.isGroup)st=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(X);else if(R.isLight)w.pushLight(R),R.castShadow&&w.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||at.intersectsSprite(R)){tt&&pe.setFromMatrixPosition(R.matrixWorld).applyMatrix4(Ht);const Ft=St.update(R),Xt=R.material;Xt.visible&&z.push(R,Ft,Xt,st,pe.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||at.intersectsObject(R))){const Ft=St.update(R),Xt=R.material;if(tt&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),pe.copy(R.boundingSphere.center)):(Ft.boundingSphere===null&&Ft.computeBoundingSphere(),pe.copy(Ft.boundingSphere.center)),pe.applyMatrix4(R.matrixWorld).applyMatrix4(Ht)),Array.isArray(Xt)){const Yt=Ft.groups;for(let se=0,le=Yt.length;se<le;se++){const ne=Yt[se],xe=Xt[ne.materialIndex];xe&&xe.visible&&z.push(R,Ft,xe,st,pe.z,ne)}}else Xt.visible&&z.push(R,Ft,Xt,st,pe.z,null)}}const wt=R.children;for(let Ft=0,Xt=wt.length;Ft<Xt;Ft++)as(wt[Ft],X,st,tt)}function qr(R,X,st,tt){const{opaque:Z,transmissive:wt,transparent:Ft}=R;w.setupLightsView(st),ut===!0&&Qt.setGlobalState(P.clippingPlanes,st),tt&&Tt.viewport(ct.copy(tt)),Z.length>0&&Qn(Z,X,st),wt.length>0&&Qn(wt,X,st),Ft.length>0&&Qn(Ft,X,st),Tt.buffers.depth.setTest(!0),Tt.buffers.depth.setMask(!0),Tt.buffers.color.setMask(!0),Tt.setPolygonOffset(!1)}function Yr(R,X,st,tt){if((st.isScene===!0?st.overrideMaterial:null)!==null)return;w.state.transmissionRenderTarget[tt.id]===void 0&&(w.state.transmissionRenderTarget[tt.id]=new Ns(1,1,{generateMipmaps:!0,type:Ct.has("EXT_color_buffer_half_float")||Ct.has("EXT_color_buffer_float")?Ir:Fi,minFilter:Us,samples:4,stencilBuffer:c,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Oe.workingColorSpace}));const wt=w.state.transmissionRenderTarget[tt.id],Ft=tt.viewport||ct;wt.setSize(Ft.z*P.transmissionResolutionScale,Ft.w*P.transmissionResolutionScale);const Xt=P.getRenderTarget(),Yt=P.getActiveCubeFace(),se=P.getActiveMipmapLevel();P.setRenderTarget(wt),P.getClearColor(B),q=P.getClearAlpha(),q<1&&P.setClearColor(16777215,.5),P.clear(),oe&&At.render(st);const le=P.toneMapping;P.toneMapping=es;const ne=tt.viewport;if(tt.viewport!==void 0&&(tt.viewport=void 0),w.setupLightsView(tt),ut===!0&&Qt.setGlobalState(P.clippingPlanes,tt),Qn(R,st,tt),kt.updateMultisampleRenderTarget(wt),kt.updateRenderTargetMipmap(wt),Ct.has("WEBGL_multisampled_render_to_texture")===!1){let xe=!1;for(let we=0,Ue=X.length;we<Ue;we++){const Ae=X[we],{object:Be,geometry:ae,material:qe,group:Re}=Ae;if(qe.side===ma&&Be.layers.test(tt.layers)){const yn=qe.side;qe.side=jn,qe.needsUpdate=!0,ln(Be,st,tt,ae,qe,Re),qe.side=yn,qe.needsUpdate=!0,xe=!0}}xe===!0&&(kt.updateMultisampleRenderTarget(wt),kt.updateRenderTargetMipmap(wt))}P.setRenderTarget(Xt,Yt,se),P.setClearColor(B,q),ne!==void 0&&(tt.viewport=ne),P.toneMapping=le}function Qn(R,X,st){const tt=X.isScene===!0?X.overrideMaterial:null;for(let Z=0,wt=R.length;Z<wt;Z++){const Ft=R[Z],{object:Xt,geometry:Yt,group:se}=Ft;let le=Ft.material;le.allowOverride===!0&&tt!==null&&(le=tt),Xt.layers.test(st.layers)&&ln(Xt,X,st,Yt,le,se)}}function ln(R,X,st,tt,Z,wt){R.onBeforeRender(P,X,st,tt,Z,wt),R.modelViewMatrix.multiplyMatrices(st.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),Z.onBeforeRender(P,X,st,tt,R,wt),Z.transparent===!0&&Z.side===ma&&Z.forceSinglePass===!1?(Z.side=jn,Z.needsUpdate=!0,P.renderBufferDirect(st,X,tt,Z,R,wt),Z.side=ns,Z.needsUpdate=!0,P.renderBufferDirect(st,X,tt,Z,R,wt),Z.side=ma):P.renderBufferDirect(st,X,tt,Z,R,wt),R.onAfterRender(P,X,st,tt,Z,wt)}function pn(R,X,st){X.isScene!==!0&&(X=Pe);const tt=Pt.get(R),Z=w.state.lights,wt=w.state.shadowsArray,Ft=Z.state.version,Xt=ot.getParameters(R,Z.state,wt,X,st),Yt=ot.getProgramCacheKey(Xt);let se=tt.programs;tt.environment=R.isMeshStandardMaterial?X.environment:null,tt.fog=X.fog,tt.envMap=(R.isMeshStandardMaterial?E:U).get(R.envMap||tt.environment),tt.envMapRotation=tt.environment!==null&&R.envMap===null?X.environmentRotation:R.envMapRotation,se===void 0&&(R.addEventListener("dispose",ue),se=new Map,tt.programs=se);let le=se.get(Yt);if(le!==void 0){if(tt.currentProgram===le&&tt.lightsStateVersion===Ft)return zs(R,Xt),le}else Xt.uniforms=ot.getUniforms(R),R.onBeforeCompile(Xt,P),le=ot.acquireProgram(Xt,Yt),se.set(Yt,le),tt.uniforms=Xt.uniforms;const ne=tt.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(ne.clippingPlanes=Qt.uniform),zs(R,Xt),tt.needsLights=ll(R),tt.lightsStateVersion=Ft,tt.needsLights&&(ne.ambientLightColor.value=Z.state.ambient,ne.lightProbe.value=Z.state.probe,ne.directionalLights.value=Z.state.directional,ne.directionalLightShadows.value=Z.state.directionalShadow,ne.spotLights.value=Z.state.spot,ne.spotLightShadows.value=Z.state.spotShadow,ne.rectAreaLights.value=Z.state.rectArea,ne.ltc_1.value=Z.state.rectAreaLTC1,ne.ltc_2.value=Z.state.rectAreaLTC2,ne.pointLights.value=Z.state.point,ne.pointLightShadows.value=Z.state.pointShadow,ne.hemisphereLights.value=Z.state.hemi,ne.directionalShadowMap.value=Z.state.directionalShadowMap,ne.directionalShadowMatrix.value=Z.state.directionalShadowMatrix,ne.spotShadowMap.value=Z.state.spotShadowMap,ne.spotLightMatrix.value=Z.state.spotLightMatrix,ne.spotLightMap.value=Z.state.spotLightMap,ne.pointShadowMap.value=Z.state.pointShadowMap,ne.pointShadowMatrix.value=Z.state.pointShadowMatrix),tt.currentProgram=le,tt.uniformsList=null,le}function Vi(R){if(R.uniformsList===null){const X=R.currentProgram.getUniforms();R.uniformsList=Jc.seqWithValue(X.seq,R.uniforms)}return R.uniformsList}function zs(R,X){const st=Pt.get(R);st.outputColorSpace=X.outputColorSpace,st.batching=X.batching,st.batchingColor=X.batchingColor,st.instancing=X.instancing,st.instancingColor=X.instancingColor,st.instancingMorph=X.instancingMorph,st.skinning=X.skinning,st.morphTargets=X.morphTargets,st.morphNormals=X.morphNormals,st.morphColors=X.morphColors,st.morphTargetsCount=X.morphTargetsCount,st.numClippingPlanes=X.numClippingPlanes,st.numIntersection=X.numClipIntersection,st.vertexAlphas=X.vertexAlphas,st.vertexTangents=X.vertexTangents,st.toneMapping=X.toneMapping}function du(R,X,st,tt,Z){X.isScene!==!0&&(X=Pe),kt.resetTextureUnits();const wt=X.fog,Ft=tt.isMeshStandardMaterial?X.environment:null,Xt=C===null?P.outputColorSpace:C.isXRRenderTarget===!0?C.texture.colorSpace:zr,Yt=(tt.isMeshStandardMaterial?E:U).get(tt.envMap||Ft),se=tt.vertexColors===!0&&!!st.attributes.color&&st.attributes.color.itemSize===4,le=!!st.attributes.tangent&&(!!tt.normalMap||tt.anisotropy>0),ne=!!st.morphAttributes.position,xe=!!st.morphAttributes.normal,we=!!st.morphAttributes.color;let Ue=es;tt.toneMapped&&(C===null||C.isXRRenderTarget===!0)&&(Ue=P.toneMapping);const Ae=st.morphAttributes.position||st.morphAttributes.normal||st.morphAttributes.color,Be=Ae!==void 0?Ae.length:0,ae=Pt.get(tt),qe=w.state.lights;if(ut===!0&&(Ot===!0||R!==nt)){const Mn=R===nt&&tt.id===H;Qt.setState(tt,R,Mn)}let Re=!1;tt.version===ae.__version?(ae.needsLights&&ae.lightsStateVersion!==qe.state.version||ae.outputColorSpace!==Xt||Z.isBatchedMesh&&ae.batching===!1||!Z.isBatchedMesh&&ae.batching===!0||Z.isBatchedMesh&&ae.batchingColor===!0&&Z.colorTexture===null||Z.isBatchedMesh&&ae.batchingColor===!1&&Z.colorTexture!==null||Z.isInstancedMesh&&ae.instancing===!1||!Z.isInstancedMesh&&ae.instancing===!0||Z.isSkinnedMesh&&ae.skinning===!1||!Z.isSkinnedMesh&&ae.skinning===!0||Z.isInstancedMesh&&ae.instancingColor===!0&&Z.instanceColor===null||Z.isInstancedMesh&&ae.instancingColor===!1&&Z.instanceColor!==null||Z.isInstancedMesh&&ae.instancingMorph===!0&&Z.morphTexture===null||Z.isInstancedMesh&&ae.instancingMorph===!1&&Z.morphTexture!==null||ae.envMap!==Yt||tt.fog===!0&&ae.fog!==wt||ae.numClippingPlanes!==void 0&&(ae.numClippingPlanes!==Qt.numPlanes||ae.numIntersection!==Qt.numIntersection)||ae.vertexAlphas!==se||ae.vertexTangents!==le||ae.morphTargets!==ne||ae.morphNormals!==xe||ae.morphColors!==we||ae.toneMapping!==Ue||ae.morphTargetsCount!==Be)&&(Re=!0):(Re=!0,ae.__version=tt.version);let yn=ae.currentProgram;Re===!0&&(yn=pn(tt,X,Z));let Ma=!1,je=!1,ki=!1;const Ze=yn.getUniforms(),Sn=ae.uniforms;if(Tt.useProgram(yn.program)&&(Ma=!0,je=!0,ki=!0),tt.id!==H&&(H=tt.id,je=!0),Ma||nt!==R){Tt.buffers.depth.getReversed()&&R.reversedDepth!==!0&&(R._reversedDepth=!0,R.updateProjectionMatrix()),Ze.setValue(L,"projectionMatrix",R.projectionMatrix),Ze.setValue(L,"viewMatrix",R.matrixWorldInverse);const An=Ze.map.cameraPosition;An!==void 0&&An.setValue(L,Zt.setFromMatrixPosition(R.matrixWorld)),Dt.logarithmicDepthBuffer&&Ze.setValue(L,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(tt.isMeshPhongMaterial||tt.isMeshToonMaterial||tt.isMeshLambertMaterial||tt.isMeshBasicMaterial||tt.isMeshStandardMaterial||tt.isShaderMaterial)&&Ze.setValue(L,"isOrthographic",R.isOrthographicCamera===!0),nt!==R&&(nt=R,je=!0,ki=!0)}if(Z.isSkinnedMesh){Ze.setOptional(L,Z,"bindMatrix"),Ze.setOptional(L,Z,"bindMatrixInverse");const Mn=Z.skeleton;Mn&&(Mn.boneTexture===null&&Mn.computeBoneTexture(),Ze.setValue(L,"boneTexture",Mn.boneTexture,kt))}Z.isBatchedMesh&&(Ze.setOptional(L,Z,"batchingTexture"),Ze.setValue(L,"batchingTexture",Z._matricesTexture,kt),Ze.setOptional(L,Z,"batchingIdTexture"),Ze.setValue(L,"batchingIdTexture",Z._indirectTexture,kt),Ze.setOptional(L,Z,"batchingColorTexture"),Z._colorsTexture!==null&&Ze.setValue(L,"batchingColorTexture",Z._colorsTexture,kt));const mn=st.morphAttributes;if((mn.position!==void 0||mn.normal!==void 0||mn.color!==void 0)&&te.update(Z,st,yn),(je||ae.receiveShadow!==Z.receiveShadow)&&(ae.receiveShadow=Z.receiveShadow,Ze.setValue(L,"receiveShadow",Z.receiveShadow)),tt.isMeshGouraudMaterial&&tt.envMap!==null&&(Sn.envMap.value=Yt,Sn.flipEnvMap.value=Yt.isCubeTexture&&Yt.isRenderTargetTexture===!1?-1:1),tt.isMeshStandardMaterial&&tt.envMap===null&&X.environment!==null&&(Sn.envMapIntensity.value=X.environmentIntensity),Sn.dfgLUT!==void 0&&(Sn.dfgLUT.value=xA()),je&&(Ze.setValue(L,"toneMappingExposure",P.toneMappingExposure),ae.needsLights&&pu(Sn,ki),wt&&tt.fog===!0&&$t.refreshFogUniforms(Sn,wt),$t.refreshMaterialUniforms(Sn,tt,vt,xt,w.state.transmissionRenderTarget[R.id]),Jc.upload(L,Vi(ae),Sn,kt)),tt.isShaderMaterial&&tt.uniformsNeedUpdate===!0&&(Jc.upload(L,Vi(ae),Sn,kt),tt.uniformsNeedUpdate=!1),tt.isSpriteMaterial&&Ze.setValue(L,"center",Z.center),Ze.setValue(L,"modelViewMatrix",Z.modelViewMatrix),Ze.setValue(L,"normalMatrix",Z.normalMatrix),Ze.setValue(L,"modelMatrix",Z.matrixWorld),tt.isShaderMaterial||tt.isRawShaderMaterial){const Mn=tt.uniformsGroups;for(let An=0,wi=Mn.length;An<wi;An++){const Xi=Mn[An];Bt.update(Xi,yn),Bt.bind(Xi,yn)}}return yn}function pu(R,X){R.ambientLightColor.needsUpdate=X,R.lightProbe.needsUpdate=X,R.directionalLights.needsUpdate=X,R.directionalLightShadows.needsUpdate=X,R.pointLights.needsUpdate=X,R.pointLightShadows.needsUpdate=X,R.spotLights.needsUpdate=X,R.spotLightShadows.needsUpdate=X,R.rectAreaLights.needsUpdate=X,R.hemisphereLights.needsUpdate=X}function ll(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return Q},this.getActiveMipmapLevel=function(){return D},this.getRenderTarget=function(){return C},this.setRenderTargetTextures=function(R,X,st){const tt=Pt.get(R);tt.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,tt.__autoAllocateDepthBuffer===!1&&(tt.__useRenderToTexture=!1),Pt.get(R.texture).__webglTexture=X,Pt.get(R.depthTexture).__webglTexture=tt.__autoAllocateDepthBuffer?void 0:st,tt.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,X){const st=Pt.get(R);st.__webglFramebuffer=X,st.__useDefaultFramebuffer=X===void 0};const ss=L.createFramebuffer();this.setRenderTarget=function(R,X=0,st=0){C=R,Q=X,D=st;let tt=!0,Z=null,wt=!1,Ft=!1;if(R){const Yt=Pt.get(R);if(Yt.__useDefaultFramebuffer!==void 0)Tt.bindFramebuffer(L.FRAMEBUFFER,null),tt=!1;else if(Yt.__webglFramebuffer===void 0)kt.setupRenderTarget(R);else if(Yt.__hasExternalTextures)kt.rebindTextures(R,Pt.get(R.texture).__webglTexture,Pt.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){const ne=R.depthTexture;if(Yt.__boundDepthTexture!==ne){if(ne!==null&&Pt.has(ne)&&(R.width!==ne.image.width||R.height!==ne.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");kt.setupDepthRenderbuffer(R)}}const se=R.texture;(se.isData3DTexture||se.isDataArrayTexture||se.isCompressedArrayTexture)&&(Ft=!0);const le=Pt.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(le[X])?Z=le[X][st]:Z=le[X],wt=!0):R.samples>0&&kt.useMultisampledRTT(R)===!1?Z=Pt.get(R).__webglMultisampledFramebuffer:Array.isArray(le)?Z=le[st]:Z=le,ct.copy(R.viewport),pt.copy(R.scissor),lt=R.scissorTest}else ct.copy(_t).multiplyScalar(vt).floor(),pt.copy(Rt).multiplyScalar(vt).floor(),lt=Gt;if(st!==0&&(Z=ss),Tt.bindFramebuffer(L.FRAMEBUFFER,Z)&&tt&&Tt.drawBuffers(R,Z),Tt.viewport(ct),Tt.scissor(pt),Tt.setScissorTest(lt),wt){const Yt=Pt.get(R.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+X,Yt.__webglTexture,st)}else if(Ft){const Yt=X;for(let se=0;se<R.textures.length;se++){const le=Pt.get(R.textures[se]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+se,le.__webglTexture,st,Yt)}}else if(R!==null&&st!==0){const Yt=Pt.get(R.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,Yt.__webglTexture,st)}H=-1},this.readRenderTargetPixels=function(R,X,st,tt,Z,wt,Ft,Xt=0){if(!(R&&R.isWebGLRenderTarget)){an("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Yt=Pt.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Ft!==void 0&&(Yt=Yt[Ft]),Yt){Tt.bindFramebuffer(L.FRAMEBUFFER,Yt);try{const se=R.textures[Xt],le=se.format,ne=se.type;if(!Dt.textureFormatReadable(le)){an("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Dt.textureTypeReadable(ne)){an("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}X>=0&&X<=R.width-tt&&st>=0&&st<=R.height-Z&&(R.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+Xt),L.readPixels(X,st,tt,Z,ce.convert(le),ce.convert(ne),wt))}finally{const se=C!==null?Pt.get(C).__webglFramebuffer:null;Tt.bindFramebuffer(L.FRAMEBUFFER,se)}}},this.readRenderTargetPixelsAsync=async function(R,X,st,tt,Z,wt,Ft,Xt=0){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Yt=Pt.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Ft!==void 0&&(Yt=Yt[Ft]),Yt)if(X>=0&&X<=R.width-tt&&st>=0&&st<=R.height-Z){Tt.bindFramebuffer(L.FRAMEBUFFER,Yt);const se=R.textures[Xt],le=se.format,ne=se.type;if(!Dt.textureFormatReadable(le))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Dt.textureTypeReadable(ne))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const xe=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,xe),L.bufferData(L.PIXEL_PACK_BUFFER,wt.byteLength,L.STREAM_READ),R.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+Xt),L.readPixels(X,st,tt,Z,ce.convert(le),ce.convert(ne),0);const we=C!==null?Pt.get(C).__webglFramebuffer:null;Tt.bindFramebuffer(L.FRAMEBUFFER,we);const Ue=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await lM(L,Ue,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,xe),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,wt),L.deleteBuffer(xe),L.deleteSync(Ue),wt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,X=null,st=0){const tt=Math.pow(2,-st),Z=Math.floor(R.image.width*tt),wt=Math.floor(R.image.height*tt),Ft=X!==null?X.x:0,Xt=X!==null?X.y:0;kt.setTexture2D(R,0),L.copyTexSubImage2D(L.TEXTURE_2D,st,0,0,Ft,Xt,Z,wt),Tt.unbindTexture()};const jr=L.createFramebuffer(),Sa=L.createFramebuffer();this.copyTextureToTexture=function(R,X,st=null,tt=null,Z=0,wt=null){wt===null&&(Z!==0?(nl("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),wt=Z,Z=0):wt=0);let Ft,Xt,Yt,se,le,ne,xe,we,Ue;const Ae=R.isCompressedTexture?R.mipmaps[wt]:R.image;if(st!==null)Ft=st.max.x-st.min.x,Xt=st.max.y-st.min.y,Yt=st.isBox3?st.max.z-st.min.z:1,se=st.min.x,le=st.min.y,ne=st.isBox3?st.min.z:0;else{const mn=Math.pow(2,-Z);Ft=Math.floor(Ae.width*mn),Xt=Math.floor(Ae.height*mn),R.isDataArrayTexture?Yt=Ae.depth:R.isData3DTexture?Yt=Math.floor(Ae.depth*mn):Yt=1,se=0,le=0,ne=0}tt!==null?(xe=tt.x,we=tt.y,Ue=tt.z):(xe=0,we=0,Ue=0);const Be=ce.convert(X.format),ae=ce.convert(X.type);let qe;X.isData3DTexture?(kt.setTexture3D(X,0),qe=L.TEXTURE_3D):X.isDataArrayTexture||X.isCompressedArrayTexture?(kt.setTexture2DArray(X,0),qe=L.TEXTURE_2D_ARRAY):(kt.setTexture2D(X,0),qe=L.TEXTURE_2D),L.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,X.flipY),L.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,X.premultiplyAlpha),L.pixelStorei(L.UNPACK_ALIGNMENT,X.unpackAlignment);const Re=L.getParameter(L.UNPACK_ROW_LENGTH),yn=L.getParameter(L.UNPACK_IMAGE_HEIGHT),Ma=L.getParameter(L.UNPACK_SKIP_PIXELS),je=L.getParameter(L.UNPACK_SKIP_ROWS),ki=L.getParameter(L.UNPACK_SKIP_IMAGES);L.pixelStorei(L.UNPACK_ROW_LENGTH,Ae.width),L.pixelStorei(L.UNPACK_IMAGE_HEIGHT,Ae.height),L.pixelStorei(L.UNPACK_SKIP_PIXELS,se),L.pixelStorei(L.UNPACK_SKIP_ROWS,le),L.pixelStorei(L.UNPACK_SKIP_IMAGES,ne);const Ze=R.isDataArrayTexture||R.isData3DTexture,Sn=X.isDataArrayTexture||X.isData3DTexture;if(R.isDepthTexture){const mn=Pt.get(R),Mn=Pt.get(X),An=Pt.get(mn.__renderTarget),wi=Pt.get(Mn.__renderTarget);Tt.bindFramebuffer(L.READ_FRAMEBUFFER,An.__webglFramebuffer),Tt.bindFramebuffer(L.DRAW_FRAMEBUFFER,wi.__webglFramebuffer);for(let Xi=0;Xi<Yt;Xi++)Ze&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,Pt.get(R).__webglTexture,Z,ne+Xi),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,Pt.get(X).__webglTexture,wt,Ue+Xi)),L.blitFramebuffer(se,le,Ft,Xt,xe,we,Ft,Xt,L.DEPTH_BUFFER_BIT,L.NEAREST);Tt.bindFramebuffer(L.READ_FRAMEBUFFER,null),Tt.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(Z!==0||R.isRenderTargetTexture||Pt.has(R)){const mn=Pt.get(R),Mn=Pt.get(X);Tt.bindFramebuffer(L.READ_FRAMEBUFFER,jr),Tt.bindFramebuffer(L.DRAW_FRAMEBUFFER,Sa);for(let An=0;An<Yt;An++)Ze?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,mn.__webglTexture,Z,ne+An):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,mn.__webglTexture,Z),Sn?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,Mn.__webglTexture,wt,Ue+An):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,Mn.__webglTexture,wt),Z!==0?L.blitFramebuffer(se,le,Ft,Xt,xe,we,Ft,Xt,L.COLOR_BUFFER_BIT,L.NEAREST):Sn?L.copyTexSubImage3D(qe,wt,xe,we,Ue+An,se,le,Ft,Xt):L.copyTexSubImage2D(qe,wt,xe,we,se,le,Ft,Xt);Tt.bindFramebuffer(L.READ_FRAMEBUFFER,null),Tt.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else Sn?R.isDataTexture||R.isData3DTexture?L.texSubImage3D(qe,wt,xe,we,Ue,Ft,Xt,Yt,Be,ae,Ae.data):X.isCompressedArrayTexture?L.compressedTexSubImage3D(qe,wt,xe,we,Ue,Ft,Xt,Yt,Be,Ae.data):L.texSubImage3D(qe,wt,xe,we,Ue,Ft,Xt,Yt,Be,ae,Ae):R.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,wt,xe,we,Ft,Xt,Be,ae,Ae.data):R.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,wt,xe,we,Ae.width,Ae.height,Be,Ae.data):L.texSubImage2D(L.TEXTURE_2D,wt,xe,we,Ft,Xt,Be,ae,Ae);L.pixelStorei(L.UNPACK_ROW_LENGTH,Re),L.pixelStorei(L.UNPACK_IMAGE_HEIGHT,yn),L.pixelStorei(L.UNPACK_SKIP_PIXELS,Ma),L.pixelStorei(L.UNPACK_SKIP_ROWS,je),L.pixelStorei(L.UNPACK_SKIP_IMAGES,ki),wt===0&&X.generateMipmaps&&L.generateMipmap(qe),Tt.unbindTexture()},this.initRenderTarget=function(R){Pt.get(R).__webglFramebuffer===void 0&&kt.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?kt.setTextureCube(R,0):R.isData3DTexture?kt.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?kt.setTexture2DArray(R,0):kt.setTexture2D(R,0),Tt.unbindTexture()},this.resetState=function(){Q=0,D=0,C=null,Tt.reset(),G.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return zi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const n=this.getContext();n.drawingBufferColorSpace=Oe._getDrawingBufferColorSpace(t),n.unpackColorSpace=Oe._getUnpackColorSpace()}}class Oi extends Error{operation;constructor(t,n){super(t),this.name="KernelError",this.operation=n}}class _A{name="stub";#t=new Map;#n=0;async init(){}async createBox(t){const{width:n,height:s,depth:l,center:c}=t;if(n<=0||s<=0||l<=0)throw new Oi("Box dimensions must be positive","createBox");const f=new Vr(n,s,l);return c&&f.translate(c.x,c.y,c.z),this.#e(f)}async extrude(t){const{profile:n,distance:s,direction:l}=t;if(n.points.length<3)throw new Oi("Extrude profile needs at least three points","extrude");if(s<=0)throw new Oi("Extrude distance must be positive","extrude");const c=new q_(n.points.map(d=>new Nt(d.x,d.y))),f=new mp(c,{depth:s,bevelEnabled:!1});if(l){const d=new Y(l.x,l.y,l.z);if(d.lengthSq()===0)throw new Oi("Extrude direction must be non-zero","extrude");const m=new is().setFromUnitVectors(new Y(0,0,1),d.normalize());f.applyQuaternion(m)}return this.#e(f)}async booleanUnion(t,n){throw new Oi("Boolean union requires the WASM kernel","booleanUnion")}async booleanSubtract(t,n){throw new Oi("Boolean subtract requires the WASM kernel","booleanSubtract")}async booleanIntersect(t,n){throw new Oi("Boolean intersect requires the WASM kernel","booleanIntersect")}async fillet(t,n){throw new Oi("Fillet requires the WASM kernel","fillet")}async chamfer(t,n){throw new Oi("Chamfer requires the WASM kernel","chamfer")}async triangulate(t,n){const s=this.#t.get(t.id);if(!s)throw new Oi(`Unknown shape: ${t.id}`,"triangulate");return vA(s)}dispose(t){const n=this.#t.get(t.id);n&&(n.dispose(),this.#t.delete(t.id))}#e(t){const n=`stub-shape-${this.#n++}`;return this.#t.set(n,t),{id:n}}}function vA(r){r.getAttribute("normal")||r.computeVertexNormals();const t=r.getAttribute("position"),n=r.getAttribute("normal"),s=r.index,l=Array.from(t.array),c=n?Array.from(n.array):[],f=s?Array.from(s.array):Array.from({length:t.count},(d,m)=>m);return{positions:l,normals:c,indices:f}}function yA(r){const t=new Zn;return t.setAttribute("position",new Tn(r.positions,3)),r.normals.length>0&&t.setAttribute("normal",new Tn(r.normals,3)),t.setIndex(r.indices),r.normals.length===0&&t.computeVertexNormals(),t}const tp=1;function SA(r={}){const t=r.now??new Date().toISOString();return{version:tp,metadata:{name:r.name??"Untitled",created:t,modified:t,units:r.units??"mm"},parts:[],features:[]}}function MA(r,t,n=[]){return{id:r,name:t,bodies:n}}function bA(r,t,n){return{id:r,name:t,mesh:n}}function EA(r){return r.parts.reduce((t,n)=>t+n.bodies.length,0)}const $c=".tectonic";class Cs extends Error{constructor(t){super(t),this.name="DocumentParseError"}}function TA(r={}){return SA(r)}function AA(r){return JSON.stringify(r,null,2)}function RA(r){let t;try{t=JSON.parse(r)}catch(n){throw new Cs(`Not valid JSON: ${n.message}`)}return CA(t)}function CA(r){if(typeof r!="object"||r===null||Array.isArray(r))throw new Cs("Document must be a JSON object");const t=r;if(typeof t.version!="number")throw new Cs('Document is missing a numeric "version"');if(t.version>tp)throw new Cs(`Document version ${t.version} is newer than this build supports (${tp})`);if(typeof t.metadata!="object"||t.metadata===null)throw new Cs('Document is missing "metadata"');if(!Array.isArray(t.parts))throw new Cs('Document is missing a "parts" array');if(!Array.isArray(t.features))throw new Cs('Document is missing a "features" array');return t}async function wA(r){return RA(await r.text())}function DA(){return new Promise((r,t)=>{const n=window.document.createElement("input");n.type="file",n.accept=$c,n.style.display="none";const s=()=>{n.remove()};n.addEventListener("change",()=>{const l=n.files?.[0];if(s(),!l){r(null);return}wA(l).then(r,t)}),n.addEventListener("cancel",()=>{s(),r(null)}),window.document.body.appendChild(n),n.click()})}function UA(r,t){const n=`${r.metadata.name}${$c}`,s=new Blob([AA(r)],{type:"application/json"}),l=URL.createObjectURL(s),c=window.document.createElement("a");c.href=l,c.download=n.endsWith($c)?n:`${n}${$c}`,window.document.body.appendChild(c),c.click(),c.remove(),URL.revokeObjectURL(l)}const m_={type:"change"},xp={type:"start"},av={type:"end"},qc=new fp,x_=new Ja,LA=Math.cos(70*uM.DEG2RAD),gn=new Y,Yn=2*Math.PI,We={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},od=1e-6;class NA extends Db{constructor(t,n=null){super(t,n),this.state=We.NONE,this.target=new Y,this.cursor=new Y,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Dr.ROTATE,MIDDLE:Dr.DOLLY,RIGHT:Dr.PAN},this.touches={ONE:Cr.ROTATE,TWO:Cr.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new Y,this._lastQuaternion=new is,this._lastTargetPosition=new Y,this._quat=new is().setFromUnitVectors(t.up,new Y(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Xg,this._sphericalDelta=new Xg,this._scale=1,this._panOffset=new Y,this._rotateStart=new Nt,this._rotateEnd=new Nt,this._rotateDelta=new Nt,this._panStart=new Nt,this._panEnd=new Nt,this._panDelta=new Nt,this._dollyStart=new Nt,this._dollyEnd=new Nt,this._dollyDelta=new Nt,this._dollyDirection=new Y,this._mouse=new Nt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=PA.bind(this),this._onPointerDown=OA.bind(this),this._onPointerUp=zA.bind(this),this._onContextMenu=kA.bind(this),this._onMouseWheel=IA.bind(this),this._onKeyDown=HA.bind(this),this._onTouchStart=GA.bind(this),this._onTouchMove=VA.bind(this),this._onMouseDown=BA.bind(this),this._onMouseMove=FA.bind(this),this._interceptControlDown=XA.bind(this),this._interceptControlUp=WA.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(m_),this.update(),this.state=We.NONE}update(t=null){const n=this.object.position;gn.copy(n).sub(this.target),gn.applyQuaternion(this._quat),this._spherical.setFromVector3(gn),this.autoRotate&&this.state===We.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let s=this.minAzimuthAngle,l=this.maxAzimuthAngle;isFinite(s)&&isFinite(l)&&(s<-Math.PI?s+=Yn:s>Math.PI&&(s-=Yn),l<-Math.PI?l+=Yn:l>Math.PI&&(l-=Yn),s<=l?this._spherical.theta=Math.max(s,Math.min(l,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(s+l)/2?Math.max(s,this._spherical.theta):Math.min(l,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let c=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const f=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),c=f!=this._spherical.radius}if(gn.setFromSpherical(this._spherical),gn.applyQuaternion(this._quatInverse),n.copy(this.target).add(gn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let f=null;if(this.object.isPerspectiveCamera){const d=gn.length();f=this._clampDistance(d*this._scale);const m=d-f;this.object.position.addScaledVector(this._dollyDirection,m),this.object.updateMatrixWorld(),c=!!m}else if(this.object.isOrthographicCamera){const d=new Y(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const m=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),c=m!==this.object.zoom;const p=new Y(this._mouse.x,this._mouse.y,0);p.unproject(this.object),this.object.position.sub(p).add(d),this.object.updateMatrixWorld(),f=gn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;f!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(f).add(this.object.position):(qc.origin.copy(this.object.position),qc.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(qc.direction))<LA?this.object.lookAt(this.target):(x_.setFromNormalAndCoplanarPoint(this.object.up,this.target),qc.intersectPlane(x_,this.target))))}else if(this.object.isOrthographicCamera){const f=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),f!==this.object.zoom&&(this.object.updateProjectionMatrix(),c=!0)}return this._scale=1,this._performCursorZoom=!1,c||this._lastPosition.distanceToSquared(this.object.position)>od||8*(1-this._lastQuaternion.dot(this.object.quaternion))>od||this._lastTargetPosition.distanceToSquared(this.target)>od?(this.dispatchEvent(m_),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Yn/60*this.autoRotateSpeed*t:Yn/60/60*this.autoRotateSpeed}_getZoomScale(t){const n=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*n)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,n){gn.setFromMatrixColumn(n,0),gn.multiplyScalar(-t),this._panOffset.add(gn)}_panUp(t,n){this.screenSpacePanning===!0?gn.setFromMatrixColumn(n,1):(gn.setFromMatrixColumn(n,0),gn.crossVectors(this.object.up,gn)),gn.multiplyScalar(t),this._panOffset.add(gn)}_pan(t,n){const s=this.domElement;if(this.object.isPerspectiveCamera){const l=this.object.position;gn.copy(l).sub(this.target);let c=gn.length();c*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*c/s.clientHeight,this.object.matrix),this._panUp(2*n*c/s.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/s.clientWidth,this.object.matrix),this._panUp(n*(this.object.top-this.object.bottom)/this.object.zoom/s.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,n){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const s=this.domElement.getBoundingClientRect(),l=t-s.left,c=n-s.top,f=s.width,d=s.height;this._mouse.x=l/f*2-1,this._mouse.y=-(c/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const n=this.domElement;this._rotateLeft(Yn*this._rotateDelta.x/n.clientHeight),this._rotateUp(Yn*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let n=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Yn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),n=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Yn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),n=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Yn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),n=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Yn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),n=!0;break}n&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),l=.5*(t.pageY+n.y);this._rotateStart.set(s,l)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),l=.5*(t.pageY+n.y);this._panStart.set(s,l)}}_handleTouchStartDolly(t){const n=this._getSecondPointerPosition(t),s=t.pageX-n.x,l=t.pageY-n.y,c=Math.sqrt(s*s+l*l);this._dollyStart.set(0,c)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const s=this._getSecondPointerPosition(t),l=.5*(t.pageX+s.x),c=.5*(t.pageY+s.y);this._rotateEnd.set(l,c)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const n=this.domElement;this._rotateLeft(Yn*this._rotateDelta.x/n.clientHeight),this._rotateUp(Yn*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),l=.5*(t.pageY+n.y);this._panEnd.set(s,l)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const n=this._getSecondPointerPosition(t),s=t.pageX-n.x,l=t.pageY-n.y,c=Math.sqrt(s*s+l*l);this._dollyEnd.set(0,c),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const f=(t.pageX+n.x)*.5,d=(t.pageY+n.y)*.5;this._updateZoomParameters(f,d)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==t.pointerId){this._pointers.splice(n,1);return}}_isTrackingPointer(t){for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==t.pointerId)return!0;return!1}_trackPointer(t){let n=this._pointerPositions[t.pointerId];n===void 0&&(n=new Nt,this._pointerPositions[t.pointerId]=n),n.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const n=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[n]}_customWheelEvent(t){const n=t.deltaMode,s={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(n){case 1:s.deltaY*=16;break;case 2:s.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(s.deltaY*=10),s}}function OA(r){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(r.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(r)&&(this._addPointer(r),r.pointerType==="touch"?this._onTouchStart(r):this._onMouseDown(r)))}function PA(r){this.enabled!==!1&&(r.pointerType==="touch"?this._onTouchMove(r):this._onMouseMove(r))}function zA(r){switch(this._removePointer(r),this._pointers.length){case 0:this.domElement.releasePointerCapture(r.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(av),this.state=We.NONE;break;case 1:const t=this._pointers[0],n=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:n.x,pageY:n.y});break}}function BA(r){let t;switch(r.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Dr.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(r),this.state=We.DOLLY;break;case Dr.ROTATE:if(r.ctrlKey||r.metaKey||r.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(r),this.state=We.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(r),this.state=We.ROTATE}break;case Dr.PAN:if(r.ctrlKey||r.metaKey||r.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(r),this.state=We.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(r),this.state=We.PAN}break;default:this.state=We.NONE}this.state!==We.NONE&&this.dispatchEvent(xp)}function FA(r){switch(this.state){case We.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(r);break;case We.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(r);break;case We.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(r);break}}function IA(r){this.enabled===!1||this.enableZoom===!1||this.state!==We.NONE||(r.preventDefault(),this.dispatchEvent(xp),this._handleMouseWheel(this._customWheelEvent(r)),this.dispatchEvent(av))}function HA(r){this.enabled!==!1&&this._handleKeyDown(r)}function GA(r){switch(this._trackPointer(r),this._pointers.length){case 1:switch(this.touches.ONE){case Cr.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(r),this.state=We.TOUCH_ROTATE;break;case Cr.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(r),this.state=We.TOUCH_PAN;break;default:this.state=We.NONE}break;case 2:switch(this.touches.TWO){case Cr.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(r),this.state=We.TOUCH_DOLLY_PAN;break;case Cr.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(r),this.state=We.TOUCH_DOLLY_ROTATE;break;default:this.state=We.NONE}break;default:this.state=We.NONE}this.state!==We.NONE&&this.dispatchEvent(xp)}function VA(r){switch(this._trackPointer(r),this.state){case We.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(r),this.update();break;case We.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(r),this.update();break;case We.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(r),this.update();break;case We.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(r),this.update();break;default:this.state=We.NONE}}function kA(r){this.enabled!==!1&&r.preventDefault()}function XA(r){r.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function WA(r){r.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const qA=1711393,YA=5086169;function jA({meshes:r}){const t=zn.useRef(null),n=zn.useRef(null),s=zn.useRef(null);return zn.useEffect(()=>{const l=t.current;if(!l)return;const c=new PM;c.background=new Te(qA),n.current=c;const f=new _i(50,1,.1,1e4);f.position.set(120,90,140);const d=new gA({antialias:!0});d.setPixelRatio(Math.min(window.devicePixelRatio,2)),l.appendChild(d.domElement);const m=new NA(f,d.domElement);m.enableDamping=!0,m.dampingFactor=.08,c.add(new Ab(16777215,.6));const p=new kg(16777215,1.6);p.position.set(1,2,1.5),c.add(p);const x=new kg(16777215,.5);x.position.set(-1.5,-.5,-1),c.add(x);const g=new Cb(400,40,3817801,2633011);c.add(g),c.add(new wb(60));const _=new qo;c.add(_),s.current=_;const S=()=>{const{clientWidth:y,clientHeight:z}=l;y===0||z===0||(d.setSize(y,z,!1),f.aspect=y/z,f.updateProjectionMatrix())};S();const b=new ResizeObserver(S);b.observe(l);let A=0;const M=()=>{A=requestAnimationFrame(M),m.update(),d.render(c,f)};return M(),()=>{cancelAnimationFrame(A),b.disconnect(),m.dispose(),d.dispose(),d.domElement.remove(),g_(_),g.dispose(),n.current=null,s.current=null}},[]),zn.useEffect(()=>{const l=s.current;if(!l)return;g_(l);const c=new Sb({color:YA,metalness:.1,roughness:.55,flatShading:!1});for(const f of r){const d=yA(f);l.add(new Hi(d,c));const m=new GM(d,20);l.add(new cu(m,new lu({color:988183})))}return()=>{c.dispose()}},[r]),he.jsx("div",{className:"viewport",ref:t,"data-testid":"three-viewport"})}function g_(r){for(const t of[...r.children])r.remove(t),(t instanceof Hi||t instanceof cu)&&t.geometry.dispose()}function ZA(r){return r.indices.length/3}function su({variant:r="secondary",size:t="medium",className:n,children:s,...l}){const c=["btn",`btn--${r}`,`btn--${t}`,n].filter(Boolean).join(" ");return he.jsx("button",{type:"button",className:c,...l,children:s})}function KA({document:r,onSave:t,onClose:n}){const s=zn.useMemo(()=>r.parts.flatMap(c=>c.bodies.map(f=>f.mesh)),[r]),l=zn.useMemo(()=>s.reduce((c,f)=>c+ZA(f),0),[s]);return he.jsxs("div",{className:"editor",children:[he.jsxs("header",{className:"editor__bar",children:[he.jsx("span",{className:"editor__brand",children:"Tectonic"}),he.jsx("span",{className:"editor__doc",children:r.metadata.name}),he.jsx("div",{className:"editor__spacer"}),he.jsx(su,{onClick:t,children:"Save"}),he.jsx(su,{variant:"ghost",onClick:n,children:"Close"})]}),he.jsxs("div",{className:"editor__body",children:[he.jsxs("aside",{className:"editor__panel",children:[he.jsx("h2",{className:"editor__panel-title",children:"Feature Tree"}),r.parts.length===0?he.jsx("p",{className:"editor__empty",children:"No parts yet."}):he.jsx("ul",{className:"editor__tree",children:r.parts.map(c=>he.jsxs("li",{children:[he.jsx("span",{className:"editor__node editor__node--part",children:c.name}),he.jsx("ul",{children:c.bodies.map(f=>he.jsx("li",{className:"editor__node",children:f.name},f.id))})]},c.id))}),r.features.length>0?he.jsx("ul",{className:"editor__tree",children:r.features.map(c=>he.jsx("li",{className:"editor__node",children:c.name},c.id))}):null]}),he.jsx("section",{className:"editor__viewport",children:he.jsx(jA,{meshes:s})})]}),he.jsxs("footer",{className:"editor__status",children:[he.jsxs("span",{children:[r.parts.length," parts"]}),he.jsxs("span",{children:[EA(r)," bodies"]}),he.jsxs("span",{children:[l.toLocaleString()," triangles"]}),he.jsx("span",{children:r.metadata.units})]})]})}function QA({onNewDocument:r,onOpenFile:t,busy:n=!1,error:s}){return he.jsx("main",{className:"start",children:he.jsxs("div",{className:"start__inner",children:[he.jsxs("header",{className:"start__brand",children:[he.jsx("h1",{className:"start__wordmark",children:"Tectonic"}),he.jsx("p",{className:"start__tagline",children:"Parametric CAD in the browser"})]}),he.jsxs("div",{className:"start__actions",children:[he.jsxs(su,{variant:"primary",size:"large",onClick:r,disabled:n,children:[he.jsx("span",{className:"start__action-title",children:"New Document"}),he.jsx("span",{className:"start__action-sub",children:"Start from an empty part studio"})]}),he.jsxs(su,{size:"large",onClick:t,disabled:n,children:[he.jsx("span",{className:"start__action-title",children:"Open File"}),he.jsx("span",{className:"start__action-sub",children:"Load an existing .tectonic document"})]})]}),s?he.jsx("p",{className:"start__error",role:"alert",children:s}):null]})})}const Yc=60;async function JA(r,t={}){const n=TA(t),s=await r.createBox({width:Yc,height:Yc,depth:Yc,center:{x:0,y:Yc/2,z:0}}),l=await r.triangulate(s);return r.dispose(s),{...n,parts:[MA("part-1","Part 1",[bA("body-1","Box 1",l)])]}}function $A({kernel:r}){const t=zn.useMemo(()=>r??new _A,[r]),[n,s]=zn.useState(null),[l,c]=zn.useState(!1),[f,d]=zn.useState(void 0),m=zn.useCallback(async()=>{c(!0),d(void 0);try{await t.init(),s(await JA(t))}catch(_){d(`Could not create document: ${_.message}`)}finally{c(!1)}},[t]),p=zn.useCallback(async()=>{d(void 0);try{const _=await DA();_&&s(_)}catch(_){d(`Could not open file: ${_.message}`)}},[]),x=zn.useCallback(()=>{n&&UA(n)},[n]),g=zn.useCallback(()=>{s(null)},[]);return n?he.jsx(KA,{document:n,onSave:x,onClose:g}):he.jsx(QA,{onNewDocument:()=>{m()},onOpenFile:()=>{p()},busy:l,error:f})}function t2(){return he.jsx($A,{})}const sv=document.getElementById("root");if(!sv)throw new Error("Root container #root not found");vS.createRoot(sv).render(he.jsx(zn.StrictMode,{children:he.jsx(t2,{})}));
