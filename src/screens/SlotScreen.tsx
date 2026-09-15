            <div className="mt-3 pt-3 border-t border-toxic-900/40 text-[10px] font-mono text-toxic-100/50 space-y-1.5 px-1">
              <div><SpecialIcon symId="wild" label="= substitutes for any symbol" /></div>
              <div><SpecialIcon symId="scatter" label="= Free Toxic Twists" /></div>
              <div><SpecialIcon symId="hazard" label="= Mystery Goop" /></div>
              <div><SpecialIcon symId="jackpot" label="= Instant Puke Points!" /></div>
              {/* ✅ WHEEL NOW AT BOTTOM — LAST LINE */}
              <div className="flex items-center gap-2">
                <img 
                  src="/radioactive-risk-wheel.png" 
                  alt="Radioactive Risk Wheel" 
                  className="w-5 h-5 object-contain inline-block"
                  style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}
                />
                <span>Radioactive Risk Wheel — Activates on Puke Point wins of 10 or more</span>
              </div>
            </div>
