import{A as e,C as t,D as n,E as r,F as i,I as a,M as o,N as s,O as c,P as l,S as u,T as d,_ as f,a as ee,b as p,c as m,d as h,f as g,g as te,h as ne,i as _,j as re,k as ie,l as v,m as y,n as b,o as x,p as ae,r as S,s as oe,t as C,u as se,v as w,w as T,x as ce,y as le}from"./index-DXqxvupW.js";var E=class e extends T{constructor(){let t=e.SkyShader,n=new ie({name:t.name,uniforms:i.clone(t.uniforms),vertexShader:t.vertexShader,fragmentShader:t.fragmentShader,side:1,depthWrite:!1});super(new v(1,1,1),n),this.isSky=!0}};E.SkyShader={name:`SkyShader`,uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new a},up:{value:new a(0,1,0)},cloudScale:{value:2e-4},cloudSpeed:{value:1e-4},cloudCoverage:{value:.4},cloudDensity:{value:.4},cloudElevation:{value:.5},showSunDisc:{value:1},time:{value:0}},vertexShader:`
		uniform vec3 sunPosition;
		uniform float rayleigh;
		uniform float turbidity;
		uniform float mieCoefficient;
		uniform vec3 up;

		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		// constants for atmospheric scattering
		const float e = 2.71828182845904523536028747135266249775724709369995957;
		const float pi = 3.141592653589793238462643383279502884197169;

		// wavelength of used primaries, according to preetham
		const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
		// this pre-calculation replaces older TotalRayleigh(vec3 lambda) function:
		// (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
		const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

		// mie stuff
		// K coefficient for the primaries
		const float v = 4.0;
		const vec3 K = vec3( 0.686, 0.678, 0.666 );
		// MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
		const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

		// earth shadow hack
		// cutoffAngle = pi / 1.95;
		const float cutoffAngle = 1.6110731556870734;
		const float steepness = 1.5;
		const float EE = 1000.0;

		float sunIntensity( float zenithAngleCos ) {
			zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
			return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
		}

		vec3 totalMie( float T ) {
			float c = ( 0.2 * T ) * 10E-18;
			return 0.434 * c * MieConst;
		}

		void main() {

			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vWorldPosition = worldPosition.xyz;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			gl_Position.z = gl_Position.w; // set z to camera.far

			vSunDirection = normalize( sunPosition );

			vSunE = sunIntensity( dot( vSunDirection, up ) );

			vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

			float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

			// extinction (absorption + out scattering)
			// rayleigh coefficients
			vBetaR = totalRayleigh * rayleighCoefficient;

			// mie coefficients
			vBetaM = totalMie( turbidity ) * mieCoefficient;

		}`,fragmentShader:`
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		uniform float mieDirectionalG;
		uniform vec3 up;
		uniform float cloudScale;
		uniform float cloudSpeed;
		uniform float cloudCoverage;
		uniform float cloudDensity;
		uniform float cloudElevation;
		uniform float showSunDisc;
		uniform float time;

		// Cloud noise functions
		float hash( vec2 p ) {
			return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 );
		}

		float noise( vec2 p ) {
			vec2 i = floor( p );
			vec2 f = fract( p );
			f = f * f * ( 3.0 - 2.0 * f );
			float a = hash( i );
			float b = hash( i + vec2( 1.0, 0.0 ) );
			float c = hash( i + vec2( 0.0, 1.0 ) );
			float d = hash( i + vec2( 1.0, 1.0 ) );
			return mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y );
		}

		float fbm( vec2 p ) {
			float value = 0.0;
			float amplitude = 0.5;
			for ( int i = 0; i < 5; i ++ ) {
				value += amplitude * noise( p );
				p *= 2.0;
				amplitude *= 0.5;
			}
			return value;
		}

		// constants for atmospheric scattering
		const float pi = 3.141592653589793238462643383279502884197169;

		const float n = 1.0003; // refractive index of air
		const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

		// optical length at zenith for molecules
		const float rayleighZenithLength = 8.4E3;
		const float mieZenithLength = 1.25E3;
		// 66 arc seconds -> degrees, and the cosine of that
		const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

		// 3.0 / ( 16.0 * pi )
		const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
		// 1.0 / ( 4.0 * pi )
		const float ONE_OVER_FOURPI = 0.07957747154594767;

		float rayleighPhase( float cosTheta ) {
			return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
		}

		float hgPhase( float cosTheta, float g ) {
			float g2 = pow( g, 2.0 );
			float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
			return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
		}

		void main() {

			vec3 direction = normalize( vWorldPosition - cameraPosition );

			// optical length
			// cutoff angle at 90 to avoid singularity in next formula.
			float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
			float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
			float sR = rayleighZenithLength * inverse;
			float sM = mieZenithLength * inverse;

			// combined extinction factor
			vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

			// in scattering
			float cosTheta = dot( direction, vSunDirection );

			float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
			vec3 betaRTheta = vBetaR * rPhase;

			float mPhase = hgPhase( cosTheta, mieDirectionalG );
			vec3 betaMTheta = vBetaM * mPhase;

			vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
			Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

			// nightsky
			float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
			float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
			vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
			vec3 L0 = vec3( 0.1 ) * Fex;

			// composition + solar disc
			float sundisc = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta ) * showSunDisc;
			L0 += ( vSunE * 19000.0 * Fex ) * sundisc;

			vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

			// Clouds
			if ( direction.y > 0.0 && cloudCoverage > 0.0 ) {

				// Project to cloud plane (higher elevation = clouds appear lower/closer)
				float elevation = mix( 1.0, 0.1, cloudElevation );
				vec2 cloudUV = direction.xz / ( direction.y * elevation );
				cloudUV *= cloudScale;
				cloudUV += time * cloudSpeed;

				// Multi-octave noise for fluffy clouds
				float cloudNoise = fbm( cloudUV * 1000.0 );
				cloudNoise += 0.5 * fbm( cloudUV * 2000.0 + 3.7 );
				cloudNoise = cloudNoise * 0.5 + 0.5;

				// Apply coverage threshold
				float cloudMask = smoothstep( 1.0 - cloudCoverage, 1.0 - cloudCoverage + 0.3, cloudNoise );

				// Fade clouds near horizon (adjusted by elevation)
				float horizonFade = smoothstep( 0.0, 0.1 + 0.2 * cloudElevation, direction.y );
				cloudMask *= horizonFade;

				// Cloud lighting based on sun position
				float sunInfluence = dot( direction, vSunDirection ) * 0.5 + 0.5;
				float daylight = max( 0.0, vSunDirection.y * 2.0 );

				// Base cloud color affected by atmosphere
				vec3 atmosphereColor = Lin * 0.04;
				vec3 cloudColor = mix( vec3( 0.3 ), vec3( 1.0 ), daylight );
				cloudColor = mix( cloudColor, atmosphereColor + vec3( 1.0 ), sunInfluence * 0.5 );
				cloudColor *= vSunE * 0.00002;

				// Blend clouds with sky
				texColor = mix( texColor, cloudColor, cloudMask * cloudDensity );

			}

			gl_FragColor = vec4( texColor, 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};var D=new a(0,.08,26),O={camp:new a(-6,1,24),note:new a(-4.8,1,21.5),feed:new a(-14,1.2,-1),outlet:new a(14,1.2,-1),inscription:new a(0,1.5,-5.7),chest:new a(0,1,-20),shortcut:new a(3.4,1.2,-18),cache:new a(-18,1,5),riddle:new a(-15,1.4,12),trap:new a(17.7,1.2,10),temple:new a(0,1.4,-24.5)};function k(i,a){let m=i.scene,_=ee(20260912);m.background=new g(`#b7ced0`),m.fog=new le(`#b7ced0`,.008),m.environmentIntensity=.65,i.camera.far=260,i.camera.updateProjectionMatrix(),i.renderer.toneMappingExposure=1.15,i.renderer.shadowMap.enabled=!0,i.renderer.shadowMap.type=2;let b=new E;b.scale.setScalar(2e3),b.material.uniforms.turbidity.value=5,b.material.uniforms.rayleigh.value=1.8,b.material.uniforms.mieCoefficient.value=.004,b.material.uniforms.mieDirectionalG.value=.82,b.material.uniforms.sunPosition.value.set(-50,24,-70),m.add(b),m.add(new ce(12442338,5860165,2.1));let x=new ne(16769454,3.4);x.position.set(-30,40,10),x.target.position.set(0,0,0),x.castShadow=!0,x.shadow.mapSize.set(2048,2048),Object.assign(x.shadow.camera,{left:-38,right:38,top:42,bottom:-42,near:1,far:100}),x.shadow.normalBias=.035,x.shadow.bias=-1e-4,m.add(x,x.target),a.wall.color.set(`#c5c4a6`),a.floor.color.set(`#9aab98`),a.trim.color.set(`#c6c6af`);let oe=new d({color:`#456b40`,roughness:1}),D=new d({color:`#61594a`,roughness:1}),k=document.createElement(`canvas`);k.width=512,k.height=512;let A=k.getContext(`2d`);for(let e=0;e<9;e++){let t=e/9*Math.PI*2,n=256+Math.cos(t)*220,r=256+Math.sin(t)*220;A.strokeStyle=`#68734b`,A.lineWidth=3,A.beginPath(),A.moveTo(256,256),A.quadraticCurveTo(256+(n-256)*.6,r*.7+76.8,n,r),A.stroke();for(let e=2;e<9;e++)for(let i of[-1,1]){let a=e/10,o=256+(n-256)*a,s=256+(r-256)*a;A.save(),A.translate(o,s),A.rotate(t+i*.8);let c=27+_()*18;A.fillStyle=[`#467449`,`#629250`,`#83a460`,`#365f40`][Math.floor(_()*4)],A.beginPath(),A.moveTo(0,0),A.quadraticCurveTo(c*.6,-12,c,0),A.quadraticCurveTo(c*.5,13,0,0),A.fill(),A.restore()}}let j=new h(k);j.colorSpace=c;let M=new d({map:j,color:`#ced8ae`,alphaTest:.45,side:2,roughness:.9}),N=new d({color:`#687f6b`,roughness:1}),P=new d({color:`#a09571`,side:2,roughness:1}),ue=new d({color:`#233a37`,roughness:.9}),F=new Map,I=[],L=[];function R(e){let t=e.getAttribute(`position`);return e.setAttribute(`color`,new w(new Float32Array(t.count*3).fill(1),3)),e}function z(e,t){if(e.index){let t=e;e=t.toNonIndexed(),t.dispose()}R(e);let n=F.get(t)??[];n.push(e),F.set(t,n)}function B(e,t,n,r,i,o,s=a.wall,c=!0,l=0){let u=new v(r,i,o),d=u.getAttribute(`uv`);for(let e=0;e<d.count;e++){let t=Math.floor(e/4);d.setXY(e,d.getX(e)*(t<2?o:r)*.45,d.getY(e)*(t===2||t===3?o:i)*.45)}u.rotateY(l).translate(e,t,n),z(u,s),c&&I.push(new v(r,i,o).rotateY(l).translate(e,t,n))}function V(e,t,n=5,r=0){B(e,r+.16,t,1.15,.32,1.15,a.trim),z(new y(.34,.45,n-.55,12).translate(e,r+n/2,t),a.trim),I.push(new v(.88,n,.88).translate(e,r+n/2,t)),B(e,r+n-.1,t,1.05,.28,1.05,a.trim);for(let i of[.65,n-.5])z(new l(.4,.055,5,12).rotateX(Math.PI/2).translate(e,r+i,t),a.trim)}function H(t,n,r=5,i=0){V(t-r/2,n,3.8,i),V(t+r/2,n,3.8,i);for(let o=0;o<11;o++){let s=o/11*Math.PI,c=(o+1)/11*Math.PI-.008,l=r/2+.42,u=r/2-.42,d=new e;d.moveTo(Math.cos(s)*l,Math.sin(s)*l),d.absarc(0,0,l,s,c,!1),d.lineTo(Math.cos(c)*u,Math.sin(c)*u),d.absarc(0,0,u,c,s,!0),d.closePath(),z(new f(d,{depth:1.1,bevelEnabled:!1,curveSegments:4}).translate(t,i+3.5,n-.55),a.trim)}}function U(e,t,n,i,a,o=1.4){let s=document.createElement(`canvas`);s.width=512,s.height=256;let l=s.getContext(`2d`);l.fillStyle=`#283b36`,l.fillRect(0,0,512,256),l.strokeStyle=`#b9a773`,l.lineWidth=5,l.strokeRect(12,12,488,232),l.fillStyle=`#e7d4a0`,l.textAlign=`center`,l.font=`72px Georgia`,l.fillText(a,256,117),l.font=`26px Georgia`,l.fillText(i,256,199);let u=new h(s);u.colorSpace=c;let f=new T(new r(o,o/2),new d({map:u,roughness:.8}));return f.position.set(e,t,n),m.add(f),f}function W(e,t,n,i,o=-.08){let s=new T(new r(n,i),a.water);return s.rotation.x=-Math.PI/2,s.position.set(e,o,t),s.receiveShadow=!0,m.add(s),L.push(s),s}B(0,-.7,0,44,1.4,60,a.floor);for(let e of[-22,22])B(e,-2.1,0,2,6,61,a.wall,!1),B(e,.5,0,.7,1,60,a.trim);B(0,.5,30,44,1,.7,a.trim),B(0,1.5,-29,44,3,1,a.wall),W(0,0,900,900,-2.2),a.water.color.set(`#317e80`),a.water.emissiveIntensity=.05,a.water.opacity=.93,a.water.roughness=.2,B(-12.5,1.6,16,19,3.2,1.1),B(7,1.6,16,8,3.2,1.1),B(19,1.6,16,6,3.2,1.1),H(0,16,6),H(14,16,4),U(-3.8,1.8,16.57,`THE DROWNED APPROACH`,`☉  ≋  ☾`,2.3),B(0,.12,4,8,.24,15,a.trim),W(0,4,7.3,14.3,.26);for(let e of[-4,4])B(e,.35,4,.35,.7,15.3,a.trim);for(let e of[-3.5,11.5])B(0,.35,e,8,.7,.35,a.trim);B(-12,1.3,9,9,2.6,.8),B(-7.5,1.3,5.3,.8,2.6,7.4),B(-17,.9,1.5,9,1.8,.8),B(-13,1.1,-4.6,12,2.2,.8),H(-17.8,5,3.4),B(-17.8,5.6,5,5.3,.65,1.9,a.trim,!1),U(-15,1.4,12,`THE KEEPER’S RIDDLE`,`≋`,1.5),B(9,1.15,6,.7,2.3,9),B(18,1.15,4.6,7,2.3,.7);for(let e of[12,5,-2])V(20,e,e===5?2.8:5),V(11,e,4.4);U(11,1.6,12.5,`PRESSURE CROSSING · WATCH THE FLOW`,`≋`,1.8),B(15.5,5,-2,10.5,.6,1.2,a.trim,!1);for(let e of[-5,5])B(e,3,-11.8,1,6,8.4),B(e,3,-23,1,6,6),B(e,5,-18,1,2,4);B(-5,1.5,-18,1,3,4),B(-3.8,3,-7,2.4,6,1),B(3.8,3,-7,2.4,6,1),B(0,5.5,-7,5.2,1,1),H(0,-6.7,5.3),B(0,3.3,-26,10,6.6,1),B(0,6.5,-17,11,.5,20,a.ceiling,!1),H(0,-25.3,3.5),B(0,1.7,-25.4,3,3.4,.15,ue,!1),U(0,2,-25.25,`THE SUNKEN TEMPLE`,`☉  ≋  ☾`,2),U(0,1.45,-5.7,`FEED THE RIVER · TURN THE MOON`,`≋  →  ☾`,2.6);for(let e of[-18,-10,0,10,18])V(e,-28,10),B(e,10,-28,8.2,1.1,2.6,a.trim,!1);for(let e=0;e<5;e++){let t=32+e*9;H(t,-42,7,-1),B(t,7,-42,9,.8,2,a.trim,!1)}B(-31,6,-50,8,18,8,a.wall,!1);for(let e of[-34,-28])for(let t of[-53,-47])V(e,t,5,15);B(-31,20.1,-50,9,1,9,a.trim,!1),z(new ae(6.7,3,4).rotateY(Math.PI/4).translate(-31,22,-50),oe),z(new y(.75,1.4,1.6,12).translate(-31,16.6,-50),a.bronze);let G=new se;G.setAttribute(`position`,new w([-10,0,24,-7,0,24,-8.5,2.5,22,-10,0,20,-7,0,20,-8.5,2.5,22],3)),G.setIndex([0,2,3,3,2,5,1,4,2,4,5,2]),G.computeVertexNormals(),G.setAttribute(`uv`,new w([0,0,1,0,.5,1,0,0,1,0,.5,1],2)),z(G,P),B(-8.5,.09,22,1.2,.18,2.4,P,!1),B(-4.8,.45,21.5,1.5,.9,.9,a.wood),B(-4.8,.93,21.5,.5,.08,.36,P,!1,.2);for(let e=0;e<8;e++){let t=e/8*Math.PI*2;z(new te(.18).translate(-6+Math.cos(t)*.5,.15,24+Math.sin(t)*.5),a.trim)}let K=new o(new s({map:a.flameTex,blending:2,depthWrite:!1}));K.position.copy(O.camp).setY(.5),K.scale.set(.65,.9,1),m.add(K);let q=new n(16757082,9,8,2);q.position.copy(K.position),m.add(q);for(let e=0;e<65;e++){let t=(e%2?-1:1)*(20.5+_()*1.2),n=-26+_()*53;z(new u(.3+_()*.5,1).scale(1.5,.6,1).translate(t,.15,n),a.trim)}function J(e,t,n,i=0){z(new y(.13,.42,n,7).rotateZ(.12).translate(e,i+n/2,t),D);for(let a=0;a<25;a++){let a=_()*Math.PI*2;z(new r(3+_()*2,2.5+_()*1.5).rotateX(-.3-_()*1.3).rotateY(a).rotateZ(_()).translate(e+Math.cos(a)*1.9,i+n-1.5+_()*2.5,t+Math.sin(a)*1.9),M)}}J(-13,24,7),J(18,23,7.5),J(-19,-8,6);for(let e of[-21,21])for(let t of[-23,-11,0,14])J(e,t,4+_()*3);for(let e=0;e<32;e++){let t=(e%2?-1:1)*(35+_()*90),n=-70+_()*130,r=8+_()*27,i=new u(1,3),a=i.getAttribute(`position`);for(let e=0;e<a.count;e++){let t=a.getX(e),n=a.getY(e),r=a.getZ(e),i=1+.16*Math.sin(t*13+r*7)*Math.cos(n*9)+.07*Math.sin(r*23+t*17);a.setXYZ(e,t*i,n*i,r*i)}i.computeVertexNormals(),z(i.scale(8+_()*12,r,12+_()*16).translate(t,-r*.35,n),e%3?oe:N),e<12&&J(t,n,7,r*.3)}for(let e=0;e<90;e++){let t=(e<45?-12.5:7)+(_()-.5)*(e<45?17:7),n=3.1-_()*1.6;z(new r(.75,1.1).rotateZ((_()-.5)*.7).translate(t,n,16.65),M)}for(let[e,t]of F){let n=S(t);if(!n)throw Error(`Could not assemble the approach geometry`);let r=new T(n,e);r.castShadow=!0,r.receiveShadow=!0,m.add(r),t.forEach(e=>e.dispose())}function de(e,t,n){let r=new T(R(new v(1.4,1.1,1)),a.trim);r.position.copy(e).setY(.55),r.castShadow=!0,m.add(r),I.push(new v(1.4,1.1,1).translate(e.x,.55,e.z));let i=new p;i.position.copy(e).setY(1.5);let o=new T(new l(.58,.065,8,24),a.bronze);i.add(o);for(let e=0;e<6;e++){let t=new T(new v(.06,1.06,.07),a.bronze);t.rotation.z=e*Math.PI/3,i.add(t)}return i.add(new T(new re(.13,10,8),a.gold)),m.add(i),U(e.x,2.4,e.z,t,n,1.8),i}let fe=de(O.feed,`RIVER / SEA`,`≋`),pe=de(O.outlet,`SUN / MOON`,`☉  ☾`),me=de(O.trap,`CLOSE THE PRESSURE FEED`,`⊗`),Y=new p;Y.position.set(0,0,-20);let he=new T(R(new v(1.3,.65,.8)),a.wood);he.position.y=.4,Y.add(he);let X=new p;X.position.set(0,.76,-.4);let ge=new T(R(new v(1.35,.24,.84)),a.wood);ge.position.set(0,0,.4),X.add(ge),Y.add(X);for(let e of[-.43,.43]){let t=new T(new v(.07,.7,.84),a.bronze);t.position.set(e,.4,0),Y.add(t);let n=new T(new v(.07,.26,.86),a.bronze);n.position.set(e,0,.4),X.add(n)}let _e=new T(new v(.16,.22,.1),a.gold);_e.position.set(0,.7,.46),Y.add(_e),m.add(Y),I.push(new v(1.3,.8,.8).translate(0,.4,-20));let ve=new n(16767648,15,12,2);ve.position.set(0,3,-19),m.add(ve),U(0,2.4,-23.5,`THE WAYFARER’S CHAMBER`,`✧`,2.6);let ye=de(O.shortcut,`RETURN TO THE LANDING`,`↗`);ye.rotation.y=-.3;let be=new T(R(new v(.65,.45,.5)),a.wood);be.position.copy(O.cache).setY(.3),m.add(be);function xe(e,t,n,r){let i=new T(R(new v(n,3.6,r)),a.trim);return i.position.set(e,1.8,t),i.castShadow=!0,i.receiveShadow=!0,m.add(i),i}let Se=xe(0,-7,5,.5),Ce=xe(5,-18,.5,4),we=xe(14,16,4,.5);U(14,1.6,16.28,`OPENS FROM WITHIN`,`↗`,2);let Te=new ie({transparent:!0,depthWrite:!1,side:2,uniforms:{time:{value:0},opacity:{value:.8}},vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 vUv; uniform float time; uniform float opacity;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){float streak=noise(vec2(vUv.x*95.0,vUv.y*3.0+time*0.8));
      float fall=noise(vec2(vUv.x*37.0,vUv.y*28.0+time*12.0));
      float edge=smoothstep(0.0,0.08,vUv.x)*smoothstep(0.0,0.08,1.0-vUv.x);
      gl_FragColor=vec4(mix(vec3(0.26,0.61,0.61),vec3(0.83,0.94,0.91),streak*0.6+fall*0.5),edge*opacity*(0.3+streak*0.7));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`}),Z=new T(new r(5,6),Te);Z.position.set(0,3,-6.55),m.add(Z);let Ee=new T(new r(6,1.5),Te);Ee.position.set(15,.8,7.2),m.add(Ee);let De=new T(R(new v(4.5,.08,1.8)),a.bronze);De.position.set(15,.05,7.2),m.add(De);let Oe=W(-9,-2.7,10,.42,.035),ke=W(9,-2.7,10,.42,.035),Ae=S(I.map(e=>{let t=e.clone();return t.deleteAttribute(`normal`),t.deleteAttribute(`uv`),t}));function je(e){let t=[Ae.clone()];for(let[n,r,i,a,o]of[[!e.opened,0,-7,5,.5],[!e.shortcut,5,-18,.5,4],[!e.shortcut,14,16,4,.5]]){if(!n)continue;let e=new v(a,3.6,o).translate(r,1.8,i);e.deleteAttribute(`normal`),e.deleteAttribute(`uv`),t.push(e)}let n=S(t);return t.forEach(e=>e.dispose()),new C(n)}let Q=0,$=0;function Me(e,n,r,i=!1){let o=i?1:Math.min(1,n*1.5);Q=t.lerp(Q,+!!e.opened,o),$=t.lerp($,+!!e.shortcut,o),Se.position.y=1.8+Q*5,Se.visible=Q<.99;for(let e of[Ce,we])e.position.y=1.8+$*5,e.visible=$<.99;Z.visible=Q<.99,Z.scale.y=Math.max(.01,1-Q),Te.uniforms.time.value=r,fe.rotation.z=t.lerp(fe.rotation.z,e.feed?-Math.PI:0,o),pe.rotation.z=t.lerp(pe.rotation.z,e.outlet?-Math.PI:0,o),X.rotation.x=t.lerp(X.rotation.x,e.compass?-1.8:0,o),me.rotation.z=e.trapOff?-Math.PI:0,Ee.visible=!e.trapOff&&r%4.5>2,be.visible=!e.cache,Oe.visible=e.feed,ke.visible=e.outlet,a.water.normalMap&&a.water.normalMap.offset.set(r*.009,r*.014),K.scale.set(.65+Math.sin(r*13)*.04,.9+Math.sin(r*9)*.09,1)}return{collision:je,update:Me,sun:x,waterfall:Z,pressure:Ee,feedWheel:fe,outletWheel:pe,lid:X,sealGate:Se,sideGate:Ce,returnGate:we}}var A=`mazebound.approach.v1`;function j(){return{version:1,started:!1,feed:!1,outlet:!1,opened:!1,compass:!1,shortcut:!1,cache:!1,note:!1,trapOff:!1,finished:!1,lastEvent:`Your boat reached the old landing. An expedition camp waits above the water.`,position:null,settings:{motion:!1,autoJog:!0,leftHanded:!1,sensitivity:85,volume:65,quality:`auto`}}}var M=e=>typeof e==`object`&&!!e&&!Array.isArray(e),N=e=>typeof e==`number`&&Number.isFinite(e);function P(e){let t=j();try{let n=JSON.parse(e??`null`);if(!M(n)||n.version!==1)return t;for(let e of[`started`,`feed`,`outlet`,`opened`,`compass`,`shortcut`,`cache`,`note`,`trapOff`,`finished`])t[e]=n[e]===!0;if(typeof n.lastEvent==`string`&&(t.lastEvent=n.lastEvent.slice(0,500)),M(n.settings)){let e=n.settings;for(let n of[`motion`,`autoJog`,`leftHanded`])typeof e[n]==`boolean`&&(t.settings[n]=e[n]);N(e.sensitivity)&&(t.settings.sensitivity=Math.max(25,Math.min(150,e.sensitivity))),N(e.volume)&&(t.settings.volume=Math.max(0,Math.min(100,e.volume))),(e.quality===`auto`||e.quality===`performance`||e.quality===`quality`)&&(t.settings.quality=e.quality)}let r=n.position;return M(r)&&N(r.x)&&N(r.y)&&N(r.z)&&N(r.yaw)&&N(r.pitch)&&Math.abs(r.x)<21&&r.z>-27&&r.z<29&&r.y>=-.1&&r.y<1&&(t.position={x:r.x,y:r.y,z:r.z,yaw:r.yaw,pitch:Math.max(-1.3,Math.min(1.3,r.pitch))}),t.finished&&(t.shortcut=!0),t.shortcut&&(t.compass=!0),(t.compass||t.feed&&t.outlet)&&(t.opened=!0),t.opened&&(t.feed=!0,t.outlet=!0),t}catch{return t}}function ue(){try{return P(localStorage.getItem(A))}catch{return j()}}function F(e){try{return localStorage.setItem(A,JSON.stringify(e)),!0}catch{return!1}}var I=e=>document.getElementById(e);async function L(){document.body.classList.add(`approach`);for(let e of document.querySelectorAll(`#game > div`))e.hidden=!0;I(`boot`).hidden=!1,I(`boot-tip`).textContent=`Following the coast…`,I(`boot-fill`).style.width=`20%`;let e=document.createElement(`div`);e.id=`approach`,e.innerHTML=`
    <div id="a-title" hidden><div class="title-copy">
      <div class="eyebrow">An atlas of forgotten places</div><h1>MAZEBOUND</h1><div class="title-rule"></div>
      <h2>The Drowned Approach</h2><p>A lost expedition. A city beneath the tide.<br>Some doors open only when you understand what flows between them.</p>
      <div class="a-buttons"><button id="a-begin" class="primary">Begin the journey</button><button id="a-new" hidden>Start again</button></div>
      <a class="minor" id="a-old" href="?temple=1">Return to the original Sunken Temple</a>
      <p class="eyebrow" style="margin-top:22px">Headphones on. The world can wait.</p>
    </div></div>
    <div id="a-hud" hidden><div id="a-objective"><span class="eyebrow" id="a-region">The old landing</span><strong id="a-task">Find the expedition’s journal</strong></div>
      <div id="a-nav"><button id="a-journal">Journal</button><button id="a-pause">Pause</button></div>
      <div id="a-reticle" aria-hidden="true"></div><button id="a-action" hidden></button>
      <div id="a-controls"></div><div id="a-compass" hidden><span id="a-needle">↑</span><span id="a-bearing">Camp</span></div>
      <div id="a-save-status" aria-live="polite"></div></div>
    <div id="a-toast" role="status" hidden></div>
    <div id="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-heading" hidden><div class="a-sheet"><div class="eyebrow" id="a-kicker">Expedition journal</div><h2 id="a-heading"></h2><div id="a-body"></div><div class="a-buttons" id="a-buttons"></div></div></div>`,I(`game`).append(e);let t=I(`c`),n=new m(t),r=new x(`coast`),i=_(n.renderer,new URLSearchParams(location.search).get(`tex`)===`jpg`?`jpg`:`ktx2`),o=k(n,i),s=new oe(t);s.touchMode=navigator.maxTouchPoints>0;let c=new b(D,n.camera,i.flameTex),l=ue(),u=o.collision(l),d=!1,f=null,ee=0,p=0,h=0,g=0,te=0,ne=null,re=0,ie=``,v=``,y=!0,ae=new Uint8Array(361).fill(1),S=new a,C=new a,se=new a;c.onFootstep=e=>r.footstep(e);let w=()=>!d||!I(`a-modal`).hidden||document.hidden;function T(e,t=4800){clearTimeout(te),I(`a-toast`).textContent=e,I(`a-toast`).hidden=!1,te=window.setTimeout(()=>{I(`a-toast`).hidden=!0},t)}function ce(e){if(Math.abs(e.x)>=21.3||e.z<-27.5||e.z>29||e.y<-.1||e.y>.5||!l.opened&&Math.abs(e.x)<4.5&&e.z<-7)return!1;let t=u.raycastDistance(new a(e.x,e.y+.5,e.z),new a(0,-1,0),1);if(!Number.isFinite(t)||t>.65)return!1;let n=new a(e.x,e.y+.7,e.z);for(let e=0;e<8;e++)if(u.raycastDistance(n,new a(Math.cos(e*Math.PI/4),0,Math.sin(e*Math.PI/4)),.37)<.37)return!1;return!0}function le(){d&&c.grounded&&ce(c.pos)&&(l.position={x:c.pos.x,y:c.pos.y,z:c.pos.z,yaw:c.yaw,pitch:c.pitch})}function E(){return le(),y=F(l),I(`a-save-status`).textContent=y?`Progress saved`:`Save unavailable · keep this tab open`,y}function A(e){l.lastEvent=e,E(),T(e)}function M(){c.motion=l.settings.motion,c.autoJog=l.settings.autoJog,s.sensitivity=l.settings.sensitivity/100,s.leftHanded=l.settings.leftHanded,r.rememberVolumes(l.settings.volume,l.settings.volume),n.setQualityMode(l.settings.quality),o.sun.castShadow=l.settings.quality!==`performance`}function N(e=!1){u=o.collision(l),o.update(l,1,p,e),I(`a-compass`).hidden=!l.compass}function P(){I(`a-modal`).hidden=!0,s.suspend(),s.enabled=d,s.consumeLook(),ne?.focus({preventScroll:!0})}function L(e,t,n=[{label:`Keep exploring`,run:P,primary:!0}],r=`Expedition journal`){ne=document.activeElement instanceof HTMLElement?document.activeElement:null,s.enabled=!1,s.suspend(),I(`a-action`).hidden=!0,I(`a-heading`).textContent=e,I(`a-kicker`).textContent=r,I(`a-body`).innerHTML=t,I(`a-buttons`).replaceChildren();for(let e of n){let t=document.createElement(`button`);t.textContent=e.label,t.className=e.primary?`primary`:``,e.id&&(t.id=e.id),t.onclick=e.run,I(`a-buttons`).append(t)}I(`a-modal`).hidden=!1,I(`a-buttons`).querySelector(`button`)?.focus()}function R(){return l.note?l.opened?l.compass?l.shortcut?l.finished?`Explore the ruins or enter the Sunken Temple`:`Follow your compass back to camp`:`Find the chamber’s return mechanism`:`The water has fallen · explore the chamber`:`Follow the channels · uncover the sealed chamber`:`Find the expedition’s journal at camp`}function z(){let e=(e,t)=>`<li class="${e?`a-check`:``}">${e?`✓`:`◇`} ${t}</li>`;L(`The expedition’s trail`,`<p>${l.lastEvent}</p><ul>${e(l.note,`Read the journal at the landing`)}${e(l.opened,`Understand the River and Moon sluices`)}${e(l.compass,`Recover the wayfarer’s compass`)}${e(l.shortcut,`Open the return passage`)}${e(l.finished,`Rest at the expedition camp`)}${e(l.cache,`Optional: solve the keeper’s riddle`)}</ul><p class="a-clue">${l.note?`“The River gives. The Moon turns. The Sun must sleep.” Follow the carved channels on the ground.`:`The camp lies west of the arrival path. Look for canvas and a small fire.`}</p>`,[{label:`Keep exploring`,run:P,primary:!0},{label:`A gentle hint`,run:B}])}function B(){let e=l.opened?[`The chamber lies directly behind the waterfall, north of the long pool.`,`Look for the chest at the back of the chamber. The return wheel is on its eastern side.`]:[`Two bronze wheels stand on opposite sides of the long pool. Each controls a different channel.`,`The western wheel chooses River or Sea. The eastern wheel chooses Sun or Moon. The inscription tells you what the chamber needs.`,`Set the western wheel to River and the eastern wheel to Moon. The water will power the mechanism instead of the curtain.`];L(`Listen to the water`,`<p>${e[Math.min(re++,e.length-1)]}</p>`,[{label:`Try it`,run:P,primary:!0},{label:`Another hint`,run:B}],`A little guidance`)}function V(){E(),L(`Rest a moment`,`<p>The ruins will wait for you.</p>
      <label>Camera movement <input id="a-motion" type="checkbox" ${l.settings.motion?`checked`:``}></label>
      <label>Automatic jogging <input id="a-jog" type="checkbox" ${l.settings.autoJog?`checked`:``}></label>
      <label>Left-handed controls <input id="a-hand" type="checkbox" ${l.settings.leftHanded?`checked`:``}></label>
      <label>Look sensitivity <input id="a-sens" type="range" min="25" max="150" value="${l.settings.sensitivity}"></label>
      <label>Sound <input id="a-volume" type="range" min="0" max="100" value="${l.settings.volume}"></label>
      <label>Visual quality <select id="a-quality"><option value="auto">Automatic</option><option value="quality">Detail</option><option value="performance">Battery / performance</option></select></label>`,[{label:`Resume`,run:P,primary:!0},{label:`Save & leave`,run:H}],`The Drowned Approach`),I(`a-quality`).value=l.settings.quality;for(let e of[`a-motion`,`a-jog`,`a-hand`,`a-sens`,`a-volume`,`a-quality`])I(e).onchange=()=>{l.settings.motion=I(`a-motion`).checked,l.settings.autoJog=I(`a-jog`).checked,l.settings.leftHanded=I(`a-hand`).checked,l.settings.sensitivity=Number(I(`a-sens`).value),l.settings.volume=Number(I(`a-volume`).value);let e=I(`a-quality`).value;l.settings.quality=e===`quality`||e===`performance`?e:`auto`,M(),E()}}function H(){if(!E()){L(`Your progress could not be saved`,`<p>Your browser could not store this expedition. Keep this tab open and continue playing, or make storage available before leaving.</p>`);return}P(),d=!1,s.enabled=!1,s.suspend(),I(`a-hud`).hidden=!0,I(`a-title`).hidden=!1,I(`a-begin`).textContent=`Continue your journey`,I(`a-new`).hidden=!1,T(`The fire is banked. Goodnight, wayfarer.`)}function U(){l.compass&&l.shortcut&&(l.finished=!0,l.lastEvent=`You brought the wayfarer’s compass home. Beyond the aqueduct, the Sunken Temple waits.`);let e=E();L(l.finished?`A path worth remembering`:`A fire beside the sea`,`<p>${e?`Your discoveries and your place in the world are saved.`:`Your browser could not save. Keep this tab open to protect this session.`}</p><p>${l.finished?`You found the expedition’s compass, woke the old waterworks, and opened a way home. This coast is only the beginning.`:`The canvas shifts in the salt wind. There is no hurry. The temple will still be here tomorrow.`}</p><p class="a-clue">${l.cache?`A keeper’s tideglass rests beside your compass. You found the aqueduct’s secret.`:`The old aqueduct still keeps a small secret.`}</p>`,[{label:l.finished?`Keep wandering`:`Keep going`,run:P,primary:!0},{label:`Save & sleep`,run:H}],l.finished?`The Drowned Approach · completed`:`Nothing here expires`)}function W(){r.leverClunk(),l.feed&&l.outlet&&!l.opened?(l.opened=!0,g=2,r.rumble(2),A(`The Moon mechanism turns. The waterfall parts, revealing the wayfarer’s chamber.`)):A(l.feed?`Water follows the River. The eastern outlet faces ${l.outlet?`Moon`:`Sun`}.`:`The western sluice releases its water toward the Sea.`),N()}let G={camp:{label:()=>`Rest at the expedition camp`,enabled:()=>!0,run:U},note:{label:()=>l.note?`Read the expedition journal`:`Examine the abandoned journal`,enabled:()=>!0,run:()=>{l.note=!0,A(`The expedition followed the River and Moon into the sealed chamber.`),L(`The last dry page`,`<p>“We made landfall beneath the bell tower. The keepers hid their wayfinder beyond a curtain of water.”</p><p class="a-clue">“The River gives. The Moon turns. The Sun must sleep.”</p><p>Two sluices face one another across the long pool. Their channels still carry water. There may be a way to open the chamber without forcing the stone.</p><p>— E. Vale, third day ashore</p>`)}},feed:{label:()=>`Turn western sluice · ${l.feed?`River`:`Sea`}`,enabled:()=>!l.opened,run:()=>{l.feed=!l.feed,W()}},outlet:{label:()=>`Turn eastern outlet · ${l.outlet?`Moon`:`Sun`}`,enabled:()=>!l.opened,run:()=>{l.outlet=!l.outlet,W()}},inscription:{label:()=>`Read the waterkeeper’s inscription`,enabled:()=>!0,run:()=>L(`Three names for water`,`<p class="a-clue">“The River gives. The Moon turns. The Sun must sleep.”</p><p>A line carved beneath the words connects the western sluice to the eastern wheel. Another line ends at the curtain of water.</p>`,[{label:`Study the channels`,run:P,primary:!0},{label:`A gentle hint`,run:B}])},chest:{label:()=>`Open the expedition chest`,enabled:()=>l.opened&&!l.compass,run:()=>{l.compass=!0,r.chestOpen(),r.relicChime(),A(`You recovered the wayfarer’s compass. Its needle remembers the expedition camp.`),N(),L(`The wayfarer’s compass`,`<p>A bronze compass lies wrapped in oilcloth. Its needle turns steadily toward the landing.</p><p class="a-clue">“We did not lose this city to the sea. Someone let the water in.”</p><p>The compass now points toward camp. An old return wheel stands on the chamber’s eastern side.</p>`,void 0,`Treasure recovered`)}},shortcut:{label:()=>`Open the return passage`,enabled:()=>l.compass&&!l.shortcut,run:()=>{l.shortcut=!0,g=2,r.rumble(),A(`Two stone doors rise. The eastern cloister now leads straight back to camp.`),N()}},cache:{label:()=>`Inspect beneath the aqueduct`,enabled:()=>!l.cache,run:()=>{L(`What carries the river?`,`<p>A keeper’s mark is carved into the dry underside of the aqueduct. A small stone box waits beside it.</p><p class="a-clue">“I carry the river but never drink.”</p>`,[{label:`The aqueduct`,primary:!0,id:`a-answer`,run:()=>{l.cache=!0,A(`Beneath the aqueduct, you found the keeper’s tideglass.`),r.relicChime(),N(),L(`The keeper’s tideglass`,`<p>Blue sand falls through a delicate glass vessel. Along its bronze rim: “Measure the tide, not the hours.”</p><p>An optional relic recovered. The keeper’s riddle is solved.</p>`,void 0,`A secret of the coast`)}},{label:`The sea`,run:()=>L(`The mark stays still`,`<p>The sea receives the river. The keeper describes something built to carry it.</p>`)},{label:`Leave it for now`,run:P}])}},riddle:{label:()=>`Read the keeper’s riddle`,enabled:()=>!0,run:()=>L(`The keeper’s riddle`,`<p class="a-clue">“I carry the river but never drink.<br>My feet are stone; my belly stays dry.<br>Look beneath me for what the tide forgot.”</p><p>The old aqueduct crosses the western garden. Its arches are still standing.</p>`)},trap:{label:()=>`Close the pressure feed`,enabled:()=>!l.trapOff,run:()=>{l.trapOff=!0,r.leverClunk(),A(`The pressure falls. The eastern crossing is safe.`),N()}},temple:{label:()=>`Enter the Sunken Temple`,enabled:()=>l.compass,run:()=>{L(`Beyond the waterworks`,`<p>A stair descends into the original Sunken Temple expedition. Your approach discoveries remain saved; the temple keeps its own progress.</p>`,[{label:`Enter the temple`,primary:!0,run:()=>{E()?location.href=`/mazebound-play/?temple=1`:T(`Saving failed. Keep this tab open.`)}},{label:`Stay on the coast`,run:P}])}}};function K(){!w()&&g<=0&&f&&G[f].enabled()&&G[f].run()}function q(e=!1){if(e){let e=l.settings;l=j(),l.settings=e}let t=l.started;l.started=!0,d=!0,N(!0),M();let n=l.position,i=n?new a(n.x,n.y,n.z):D.clone(),o=ce(i);c.snapTo(o?i:D,n&&o?n.yaw:0,n&&o?n.pitch:0),I(`a-title`).hidden=!0,I(`a-hud`).hidden=!1,s.enabled=!0,E(),r.unlock(),t&&!e?L(`Where the tide left you`,`<p>${l.lastEvent}</p><p class="a-clue">${R()}</p>`,[{label:`Continue here`,run:P,primary:!0}],`Previously…`):T(`Your camp is to the left. Follow the journal’s trail when you are ready.`,6500)}I(`a-begin`).onclick=()=>q(),I(`a-new`).onclick=()=>L(`Begin a new journey?`,`<p>This replaces your coastal expedition. Your original Sunken Temple save is kept.</p>`,[{label:`Keep my journey`,run:P,primary:!0},{label:`Start fresh`,run:()=>{P(),q(!0)}}]),I(`a-action`).onclick=K,I(`a-journal`).onclick=z,I(`a-pause`).onclick=V,s.onActionKey=K,s.onJournalKey=()=>{d&&I(`a-modal`).hidden&&z()},s.onPauseKey=()=>{I(`a-modal`).hidden?d&&V():P()},document.addEventListener(`keydown`,e=>{if(e.key!==`Tab`||I(`a-modal`).hidden)return;let t=[...I(`a-modal`).querySelectorAll(`button,input,select,a`)],n=t[0],r=t.at(-1);e.shiftKey&&document.activeElement===n?(e.preventDefault(),r?.focus()):!e.shiftKey&&document.activeElement===r&&(e.preventDefault(),n?.focus())}),document.addEventListener(`visibilitychange`,()=>{document.hidden?(E(),s.suspend()):d&&I(`a-modal`).hidden&&V()}),window.addEventListener(`pagehide`,E),n.onSim=e=>{if(w())return;p+=e,h=Math.max(0,h-e),g=Math.max(0,g-e),s.pollKeyboard();let t=s.consumeLook();c.applyLook(t.dx,t.dy),g<=0&&c.sim(e,s,u,ae,D,p);let n=c.pos;if(!l.trapOff&&n.x>12&&n.x<18&&Math.abs(n.z-7.2)<1.25&&p%4.5>2&&h===0){let e=n.z>=7.2;c.snapTo(new a(15,.08,e?10.2:4.9),c.yaw,c.pitch),h=3,r.rumble(.6),T(`The pressure surge pushes you back. Close its feed wheel, or take the garden route.`),E()}n.y<-.5&&(c.snapTo(D,0,0),T(`You find your footing at the landing. Your discoveries are safe.`)),ee+=e,ee>2&&(ee=0,E()),se.set(n.x,n.y+1.2,n.z),S.set(-Math.sin(c.yaw),0,-Math.cos(c.yaw));let i=1/0;f=null;for(let e of Object.keys(O)){if(!G[e].enabled())continue;C.copy(O[e]).sub(se);let t=C.length();if(t>2.65)continue;let n=C.clone().setY(0).normalize().dot(S);if(n<-.15||u.raycastDistance(se,C.clone().normalize(),t)<t-.8)continue;let r=t+(1-n)*1.2+(e===`camp`?.35:0);r<i&&(i=r,f=e)}I(`a-action`).hidden=!f||g>0,f&&(I(`a-action`).textContent=G[f].label());let o=n.z>16?`The old landing`:Math.abs(n.x)<5&&n.z<-7?`The wayfarer’s chamber`:n.x<-5?`The aqueduct gardens`:n.x>8?`The eastern cloister`:`The waterkeeper’s court`;o!==ie&&(ie=o,I(`a-region`).textContent=o);let d=R();if(d!==v&&(v=d,I(`a-task`).textContent=d),l.compass){let e=O.camp.x-n.x,t=O.camp.z-n.z,r=Math.atan2(-e,-t)-c.yaw;I(`a-needle`).style.transform=`rotate(${-r}rad)`,I(`a-bearing`).textContent=`Camp · ${Math.round(Math.hypot(e,t))} m`}I(`a-controls`).textContent=s.touchMode?`Left thumb: walk · Right thumb: look · Tap to interact`:`WASD: walk · Click scene: mouse look · E: interact · J: journal · Esc: pause`},n.onRender=(e,t)=>{o.update(l,w()?0:1/60,p),c.torchVisible=c.pos.z<-7&&Math.abs(c.pos.x)<5,c.render(n.camera,e,t)},n.onQualityChange=e=>{o.sun.castShadow=e.pixelRatio>=1.5&&l.settings.quality!==`performance`},o.update(l,1,0,!0),c.snapTo(D,0,0),c.render(n.camera,1,0),I(`boot-fill`).style.width=`85%`,await i.settled,await n.renderer.compileAsync(n.scene,n.camera),I(`boot`).hidden=!0,I(`a-title`).hidden=!1,I(`a-begin`).textContent=l.started?`Continue your journey`:`Begin the journey`,I(`a-new`).hidden=!l.started,n.start(),new URLSearchParams(location.search).has(`debug`)&&Object.assign(window,{__approach:{engine:n,player:c,input:s,world:o,points:O,get save(){return l},get collision(){return u},get current(){return f},get time(){return p},safePosition:ce,persist:E,begin:q,closeModal:P}}),`serviceWorker`in navigator&&navigator.serviceWorker.register(`/mazebound-play/sw.js`).catch(()=>{})}export{L as bootAdventure};