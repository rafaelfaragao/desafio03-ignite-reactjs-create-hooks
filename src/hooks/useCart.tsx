import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart'); // retorna um string

    if (storagedCart) {
      return JSON.parse(storagedCart); //retornando para o valor original, de string para array de produtos
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; //preservando o cart, imutabilidade
      const productExists = updatedCart.find(product => product.id === productId); //verificando se o produto existe no carrinho

      const stock = await api.get(`/stock/${productId}`); //info do produto na api stock (id e quantidade)

      const stockAmount = stock.data.amount; //só a quantidade no stock
      const currentAmount = productExists ? productExists.amount : 0; //quantidade atual do produto no carrinho, é quantidade se existe ou zero
      const amount = currentAmount + 1; //quantidade desejada a ser colocada no carrinho

      if(amount > stockAmount) { //se a quantidade desejada for maior que a quantidade que tem no estoque, tem que dar erro
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists) {
        productExists.amount = amount; //true, atualiza a quantidade do produto
      } else { //se nao existir, tem que buscar o produto na api
        const product = await api.get(`/products/${productId}`);

        const newProduct = { //nos dados do produto na api, não tem o valor amount
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct)
      }

      setCart(updatedCart); //salvar as alterações do updatedCart no cart
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)) // o localstorage.setitem espera no argumento um string

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]; //imutabilidade
      const productIndex = updatedCart.findIndex(product => product.id === productId); //encontrando o index do produto para usar o splice para remover depois

      if (productIndex >= 0) { // a função findIndex retorna o indice encontrado no array ou o valor -1 quando não encontra
        updatedCart.splice(productIndex, 1); //remover o produto na posicão index encontrada, e quantidade 1
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)) // o localstorage.setitem espera no argumento um string
      } else {
        throw Error(); //Esse throw Error encerra o try e cai no catch assim aparecendo a messagem do toast.error
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)) // o localstorage.setitem espera no argumento um string
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
